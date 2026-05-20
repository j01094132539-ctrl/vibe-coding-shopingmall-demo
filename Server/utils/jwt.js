const jwt = require('jsonwebtoken');

// 개발용 기본 시크릿 — 프로덕션에서는 반드시 `JWT_SECRET` 환경변수 사용
const DEFAULT_DEV_SECRET = 'shopping-mall-demo-dev-secret-change-with-JWT_SECRET';

/**
 * @returns {string}
 */
function getJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(
      new Error(
        'JWT_SECRET이 설정되지 않았습니다. Heroku → Settings → Config Vars에 JWT_SECRET을 추가한 뒤 앱을 재시작하세요. (Vercel 환경변수 아님)'
      ),
      { statusCode: 500 }
    );
  }
  return DEFAULT_DEV_SECRET;
}

/**
 * @param {import('mongoose').Document} user Mongoose User document (needs _id, email, user_type)
 * @returns {string}
 */
function signLoginToken(user) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES || '7d';
  // 로그인 세션용 클레임 — 클라이언트는 `token`, 사용자 정보는 `data`로 별도 응답
  const payload = {
    sub: String(user._id),
    email: user.email,
    user_type: user.user_type,
  };
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * 로그인 시 발급한 JWT 검증 — 성공 시 디코드된 payload 반환
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload & { sub: string, email?: string, user_type?: string }}
 */
function verifyAccessToken(token) {
  const secret = getJwtSecret();
  /** @type {import('jsonwebtoken').JwtPayload & { sub: string }} */
  const decoded = jwt.verify(token, secret);
  return decoded;
}

module.exports = { signLoginToken, getJwtSecret, verifyAccessToken };
