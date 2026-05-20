/** 포트원(구 아임포트) REST API — `POST /api/orders/me` 결제 검증용 */

const IAMPORT_API_BASE = 'https://api.iamport.kr';

/** 클라이언트 `IMP.init` 가맹점 코드 — REST 키와 동일 계정이어야 함 */
const PORTONE_STORE_IMP_CODE =
  process.env.PORTONE_IMP_CODE?.trim() || 'imp67148586';

/** @type {{ token: string, expiresAt: number } | null} */
let tokenCache = null;

const PAYMENT_LOOKUP_RETRIES = 3;
const PAYMENT_LOOKUP_DELAY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPortOneCredentials() {
  const impKey = process.env.PORTONE_IMP_KEY?.trim();
  const impSecret = process.env.PORTONE_IMP_SECRET?.trim();
  if (!impKey || !impSecret) {
    const err = new Error(
      '포트원 REST API 키가 설정되지 않았습니다. Server/.env에 PORTONE_IMP_KEY, PORTONE_IMP_SECRET을 설정하세요.'
    );
    err.statusCode = 503;
    throw err;
  }
  return { impKey, impSecret };
}

/** `GET /payments/find/...` — 응답이 배열 또는 단건 객체일 수 있음 */
function normalizePaymentFindResponse(response) {
  if (response == null) return [];
  if (Array.isArray(response)) {
    return response.filter((row) => row && typeof row === 'object');
  }
  if (typeof response === 'object') {
    return [response];
  }
  return [];
}

function isPaymentNotFoundMessage(message) {
  if (typeof message !== 'string') return false;
  return (
    message.includes('존재하지 않는') ||
    message.includes('결제정보') ||
    message.toLowerCase().includes('not found')
  );
}

function buildPaymentNotFoundError(impUid, merchantUid, apiMessage) {
  const err = new Error(
    apiMessage ||
      `포트원에서 결제를 찾을 수 없습니다. imp_uid=${impUid}` +
        (merchantUid ? `, merchant_uid=${merchantUid}` : '') +
        `. 포트원 콘솔의 REST API 키가 결제에 사용한 가맹점 식별코드(${PORTONE_STORE_IMP_CODE})와 같은 계정인지 확인하세요.`
  );
  err.statusCode = 400;
  return err;
}

/** `POST /users/getToken` — 액세스 토큰 발급(서버 전용) */
async function fetchAccessToken() {
  const { impKey, impSecret } = getPortOneCredentials();

  const res = await fetch(`${IAMPORT_API_BASE}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imp_key: impKey, imp_secret: impSecret }),
  });

  /** @type {{ code?: number, message?: string, response?: { access_token?: string, expired_at?: number } }} */
  let body = {};
  try {
    body = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok || body.code !== 0 || !body.response?.access_token) {
    const err = new Error(
      body.message || '포트원 인증 토큰을 발급하지 못했습니다.'
    );
    err.statusCode = 502;
    throw err;
  }

  const expiresAtMs =
    typeof body.response.expired_at === 'number'
      ? body.response.expired_at * 1000
      : Date.now() + 30 * 60 * 1000;

  return {
    token: body.response.access_token,
    expiresAt: expiresAtMs,
  };
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const next = await fetchAccessToken();
  tokenCache = { token: next.token, expiresAt: next.expiresAt };
  return next.token;
}

/** 포트원 v1 API 공통 요청 */
async function iamportRequest(path) {
  const accessToken = await getAccessToken();

  const res = await fetch(`${IAMPORT_API_BASE}${path}`, {
    headers: { Authorization: accessToken },
  });

  /** @type {{ code?: number, message?: string, response?: unknown }} */
  let body = {};
  try {
    body = await res.json();
  } catch {
    // ignore
  }

  return { res, body };
}

/**
 * `GET /payments/{imp_uid}` — 결제 단건 조회
 * @param {string} impUid
 */
async function fetchPaymentByImpUid(impUid) {
  const { res, body } = await iamportRequest(
    `/payments/${encodeURIComponent(impUid)}`
  );

  if (!res.ok || body.code !== 0 || !body.response) {
    const err = new Error(
      body.message || '포트원 결제 정보를 조회하지 못했습니다.'
    );
    err.statusCode = isPaymentNotFoundMessage(body.message) ? 400 : 502;
    err.portoneCode = body.code;
    throw err;
  }

  return /** @type {Record<string, unknown>} */ (body.response);
}

/**
 * `GET /payments/find/{merchant_uid}/{status}` — merchant_uid로 결제 목록 조회
 * @param {string} merchantUid
 * @param {string} [status]
 */
async function fetchPaymentsByMerchantUid(merchantUid, status = 'paid') {
  const { res, body } = await iamportRequest(
    `/payments/find/${encodeURIComponent(merchantUid)}/${encodeURIComponent(status)}`
  );

  if (!res.ok || body.code !== 0) {
    const err = new Error(
      body.message || 'merchant_uid로 결제 정보를 조회하지 못했습니다.'
    );
    err.statusCode = isPaymentNotFoundMessage(body.message) ? 400 : 502;
    err.portoneCode = body.code;
    throw err;
  }

  return normalizePaymentFindResponse(body.response);
}

/** imp_uid 조회 — 결제 직후 반영 지연 대비 재시도 */
async function fetchPaymentByImpUidWithRetry(impUid) {
  let lastError;

  for (let attempt = 0; attempt < PAYMENT_LOOKUP_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await sleep(PAYMENT_LOOKUP_DELAY_MS);
    }

    try {
      return await fetchPaymentByImpUid(impUid);
    } catch (err) {
      lastError = err;
      if (!isPaymentNotFoundMessage(err.message)) {
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * imp_uid 단건 조회 실패 시 merchant_uid(paid)로 보조 조회
 * @param {{ imp_uid: string, merchant_uid?: string }} params
 */
async function resolvePortOnePayment(params) {
  const impUid = String(params.imp_uid || '').trim();
  const merchantUid =
    params.merchant_uid != null ? String(params.merchant_uid).trim() : '';

  if (!impUid && !merchantUid) {
    const err = new Error('imp_uid 또는 merchant_uid가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }

  // merchant_uid 조회가 단건 객체로 오며 imp_uid 단건 API보다 안정적인 경우가 많음
  if (merchantUid) {
    try {
      const list = await fetchPaymentsByMerchantUid(merchantUid, 'paid');
      if (list.length > 0) {
        const matched = impUid
          ? list.find((row) => String(row.imp_uid).trim() === impUid) || list[0]
          : list[0];
        return /** @type {Record<string, unknown>} */ (matched);
      }
    } catch (findErr) {
      if (!isPaymentNotFoundMessage(findErr.message)) {
        throw findErr;
      }
    }
  }

  if (impUid) {
    try {
      return await fetchPaymentByImpUidWithRetry(impUid);
    } catch (impErr) {
      if (!merchantUid || !isPaymentNotFoundMessage(impErr.message)) {
        throw impErr;
      }
    }
  }

  throw buildPaymentNotFoundError(impUid, merchantUid);
}

/**
 * imp_uid로 실결제 검증 — 금액·merchant_uid·paid 상태 확인
 * @param {{ imp_uid: string, merchant_uid?: string, expectedAmount: number }} params
 */
async function verifyPortOnePayment(params) {
  const impUid = String(params.imp_uid || '').trim();
  const merchantUid =
    params.merchant_uid != null ? String(params.merchant_uid).trim() : '';
  const expectedAmount = Math.round(Number(params.expectedAmount));

  if (!impUid) {
    const err = new Error('imp_uid가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(expectedAmount) || expectedAmount < 1) {
    const err = new Error('검증할 결제 금액이 올바르지 않습니다.');
    err.statusCode = 400;
    throw err;
  }

  const payment = await resolvePortOnePayment({
    imp_uid: impUid,
    merchant_uid: merchantUid,
  });

  const status = typeof payment.status === 'string' ? payment.status : '';
  if (status !== 'paid') {
    const err = new Error(
      `결제가 완료되지 않았습니다. (포트원 상태: ${status || 'unknown'})`
    );
    err.statusCode = 400;
    throw err;
  }

  const paidAmount = Math.round(Number(payment.amount));
  if (paidAmount !== expectedAmount) {
    const err = new Error(
      `결제 금액이 주문 금액과 일치하지 않습니다. (결제: ${paidAmount}, 주문: ${expectedAmount})`
    );
    err.statusCode = 400;
    throw err;
  }

  const portoneMerchantUid =
    typeof payment.merchant_uid === 'string' ? payment.merchant_uid.trim() : '';
  if (merchantUid && portoneMerchantUid && portoneMerchantUid !== merchantUid) {
    const err = new Error('merchant_uid가 결제 정보와 일치하지 않습니다.');
    err.statusCode = 400;
    throw err;
  }

  const resolvedImpUid =
    typeof payment.imp_uid === 'string' ? payment.imp_uid.trim() : '';
  if (resolvedImpUid && resolvedImpUid !== impUid) {
    const err = new Error('imp_uid가 결제 정보와 일치하지 않습니다.');
    err.statusCode = 400;
    throw err;
  }

  return payment;
}

module.exports = {
  verifyPortOnePayment,
  fetchPaymentByImpUid,
  resolvePortOnePayment,
};
