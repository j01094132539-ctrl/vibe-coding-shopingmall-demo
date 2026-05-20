const crypto = require('crypto');
const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const { verifyPortOnePayment } = require('../services/portone.service');
const {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  recalculateOrderTotals,
  formatOrderNumber,
} = require('../models/order.model');

const PRODUCT_POPULATE = 'name price image category sku';
const USER_POPULATE = 'name email';

function formatOrder(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

function parseObjectId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: `유효하지 않은 ${label}입니다.` };
  }
  return { value: String(id) };
}

function trimStr(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** `POST /api/orders/me` 본문 — 배송지 필수 필드 검증 */
function parseShipping(body) {
  const src = body?.shipping;
  if (!src || typeof src !== 'object') {
    return { error: 'shipping 객체가 필요합니다.' };
  }

  const recipientName = trimStr(src.recipientName);
  const phone = trimStr(src.phone);
  const postalCode = trimStr(src.postalCode);
  const addressLine1 = trimStr(src.addressLine1);

  if (!recipientName || !phone || !postalCode || !addressLine1) {
    return {
      error:
        'shipping.recipientName, phone, postalCode, addressLine1은 필수입니다.',
    };
  }

  return {
    value: {
      recipientName,
      phone,
      postalCode,
      addressLine1,
      addressLine2: trimStr(src.addressLine2),
      deliveryMemo: trimStr(src.deliveryMemo),
    },
  };
}

/** 결제 수단 — 미입력 시 데모 `demo` */
function parsePayment(body) {
  const src = body?.payment;
  const method =
    src && typeof src === 'object' && src.method != null
      ? trimStr(String(src.method))
      : 'demo';

  if (!method) {
    return { error: 'payment.method가 필요합니다.' };
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return {
      error: `payment.method는 ${PAYMENT_METHODS.join(', ')} 중 하나여야 합니다.`,
    };
  }

  const imp_uid =
    src && typeof src === 'object' && src.imp_uid != null
      ? trimStr(String(src.imp_uid))
      : '';
  const merchant_uid =
    src && typeof src === 'object' && src.merchant_uid != null
      ? trimStr(String(src.merchant_uid))
      : '';

  return { value: { method, imp_uid, merchant_uid } };
}

function parseShippingFee(body) {
  if (body?.shippingFee === undefined || body?.shippingFee === null) {
    return 0;
  }
  const fee = Number(body.shippingFee);
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: 'shippingFee는 0 이상의 숫자여야 합니다.' };
  }
  return fee;
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(String(query?.page ?? '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query?.limit ?? '20'), 10) || 20)
  );
  return { page, limit, skip: (page - 1) * limit };
}

/** 당일 주문 건수 기준 고유 주문번호 — `order.model` formatOrderNumber 사용 */
async function generateUniqueOrderNumber() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const count = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const orderNumber = formatOrderNumber(now, count + 1 + attempt);
    const exists = await Order.exists({ orderNumber });
    if (!exists) return orderNumber;
  }

  const err = new Error('주문번호 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  err.statusCode = 503;
  throw err;
}

/** 장바구니 populate 결과 → 주문 items 스냅샷 */
function buildOrderItemsFromCart(cart) {
  const items = [];

  for (const line of cart.items || []) {
    const p = line.product;
    if (!p || typeof p !== 'object') continue;

    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) continue;

    const unitPrice =
      line.unitPrice != null && Number.isFinite(Number(line.unitPrice))
        ? Number(line.unitPrice)
        : Number(p.price);

    items.push({
      product: p._id,
      sku: p.sku,
      name: p.name,
      image: p.image,
      category: p.category,
      quantity,
      unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
      lineTotal: 0,
    });
  }

  return items;
}

/** 데모 몰 — demo 선택 시 즉시 paid (포트원 미사용) */
const INSTANT_PAY_METHODS = ['demo'];

/** card·transfer는 클라이언트 포트원 결제 후 imp_uid 필수 */
const PORTONE_PAY_METHODS = ['card', 'transfer'];

function applyDemoPayment(order, method) {
  const instant = INSTANT_PAY_METHODS.includes(method);
  order.payment = {
    method,
    status: instant ? 'paid' : 'pending',
    amount: order.totalAmount,
    ...(instant
      ? {
          paidAt: new Date(),
          transactionId: `demo-${crypto.randomUUID()}`,
        }
      : {}),
  };
  order.status = instant ? 'paid' : 'pending_payment';
}

/** 포트원 `IMP.request_pay` 성공 후 — imp_uid·merchant_uid 저장 */
function applyPortOnePayment(order, payment) {
  order.payment = {
    method: payment.method,
    status: 'paid',
    amount: order.totalAmount,
    paidAt: new Date(),
    transactionId: payment.imp_uid,
    merchantUid: payment.merchant_uid || undefined,
  };
  order.status = 'paid';
}

/**
 * imp_uid·merchant_uid로 이미 생성된 주문이 있는지 확인 — `POST /api/orders/me` 직전
 * @param {{ imp_uid?: string, merchant_uid?: string }} payment
 */
async function assertNoDuplicateOrderPayment(payment) {
  const impUid = payment.imp_uid ? trimStr(payment.imp_uid) : '';
  const merchantUid = payment.merchant_uid ? trimStr(payment.merchant_uid) : '';

  const orConditions = [];
  if (impUid) orConditions.push({ 'payment.transactionId': impUid });
  if (merchantUid) orConditions.push({ 'payment.merchantUid': merchantUid });

  if (orConditions.length === 0) {
    return;
  }

  const existing = await Order.findOne({ $or: orConditions }).select(
    'orderNumber payment.transactionId payment.merchantUid'
  );

  if (existing) {
    const err = new Error(
      '이미 처리된 결제입니다. 동일한 결제로 중복 주문할 수 없습니다.'
    );
    err.statusCode = 409;
    throw err;
  }
}

/** card·transfer — 포트원 REST API로 결제 금액·상태 검증 */
async function validatePortOnePaymentBeforeOrder(payment, expectedAmount) {
  const impUid = trimStr(payment.imp_uid);
  const merchantUid = trimStr(payment.merchant_uid);

  if (!impUid) {
    const err = new Error('포트원 결제 완료 정보(imp_uid)가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }
  if (!/^imp[_\d]/i.test(impUid)) {
    const err = new Error('유효하지 않은 imp_uid 형식입니다.');
    err.statusCode = 400;
    throw err;
  }
  if (!merchantUid) {
    const err = new Error('포트원 주문번호(merchant_uid)가 필요합니다.');
    err.statusCode = 400;
    throw err;
  }

  await assertNoDuplicateOrderPayment(payment);

  await verifyPortOnePayment({
    imp_uid: impUid,
    merchant_uid: merchantUid,
    expectedAmount,
  });
}

function applyOrderPayment(order, payment) {
  const { method } = payment;

  if (PORTONE_PAY_METHODS.includes(method)) {
    applyPortOnePayment(order, payment);
    return;
  }

  applyDemoPayment(order, method);
}

/** POST /api/orders/me — 장바구니 기반 주문 생성(Create) */
async function createMyOrder(req, res, next) {
  try {
    const shippingResult = parseShipping(req.body);
    if (shippingResult.error) {
      return res.status(400).json({ message: shippingResult.error });
    }

    const paymentResult = parsePayment(req.body);
    if (paymentResult.error) {
      return res.status(400).json({ message: paymentResult.error });
    }

    const feeResult = parseShippingFee(req.body);
    if (typeof feeResult === 'object' && feeResult.error) {
      return res.status(400).json({ message: feeResult.error });
    }

    const cart = await Cart.findOne({ user: req.auth.userId }).populate(
      'items.product',
      PRODUCT_POPULATE
    );

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다.' });
    }

    const orderItems = buildOrderItemsFromCart(cart);
    if (orderItems.length === 0) {
      return res.status(400).json({ message: '주문할 수 있는 상품이 없습니다.' });
    }

    const totals = recalculateOrderTotals(orderItems, feeResult);

    // 포트원 결제 — 중복·실결제 검증 후 주문 문서 생성
    if (PORTONE_PAY_METHODS.includes(paymentResult.value.method)) {
      await validatePortOnePaymentBeforeOrder(
        paymentResult.value,
        totals.totalAmount
      );
    }

    const orderNumber = await generateUniqueOrderNumber();

    const order = new Order({
      orderNumber,
      user: req.auth.userId,
      items: totals.items,
      shipping: shippingResult.value,
      payment: {
        method: paymentResult.value.method,
        status: 'pending',
        amount: totals.totalAmount,
      },
      status: 'pending_payment',
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      totalItems: totals.totalItems,
      totalAmount: totals.totalAmount,
      sourceCart: cart._id,
    });

    applyOrderPayment(order, paymentResult.value);
    await order.save();

    cart.items = [];
    cart.totalItems = 0;
    cart.totalAmount = 0;
    await cart.save();

    res.status(201).json({ data: formatOrder(order) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/me — 내 주문 목록(Read) */
async function listMyOrders(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: req.auth.userId };

    const rawStatus = req.query.status;
    if (typeof rawStatus === 'string' && rawStatus.trim() !== '') {
      const status = rawStatus.trim();
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `status는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.`,
        });
      }
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      data: orders.map((doc) => formatOrder(doc)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/me/:id — 내 주문 상세(Read) */
async function getMyOrderById(req, res, next) {
  try {
    const parsed = parseObjectId(req.params.id, '주문 id');
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findOne({
      _id: parsed.value,
      user: req.auth.userId,
    });

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    res.json({ data: formatOrder(order) });
  } catch (err) {
    next(err);
  }
}

const CANCELLABLE_STATUSES = ['pending_payment', 'paid'];

/** PATCH /api/orders/me/:id/cancel — 본인 주문 취소(Update) */
async function cancelMyOrder(req, res, next) {
  try {
    const parsed = parseObjectId(req.params.id, '주문 id');
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findOne({
      _id: parsed.value,
      user: req.auth.userId,
    });

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        message: `현재 상태(${order.status})에서는 취소할 수 없습니다.`,
      });
    }

    const cancelReason =
      req.body?.cancelReason != null ? trimStr(String(req.body.cancelReason)) : '';

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    if (cancelReason) order.cancelReason = cancelReason;

    if (order.payment && order.payment.status === 'paid') {
      order.payment.status = 'refunded';
    } else if (order.payment) {
      order.payment.status = 'failed';
    }

    await order.save();
    res.json({ data: formatOrder(order), message: '주문이 취소되었습니다.' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders — 전체 주문 목록 (관리자 Read) */
async function listOrders(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    const rawStatus = req.query.status;
    if (typeof rawStatus === 'string' && rawStatus.trim() !== '') {
      const status = rawStatus.trim();
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `status는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.`,
        });
      }
      filter.status = status;
    }

    const rawUserId = req.query.userId;
    if (typeof rawUserId === 'string' && rawUserId.trim() !== '') {
      const userParsed = parseObjectId(rawUserId.trim(), 'userId');
      if (userParsed.error) {
        return res.status(400).json({ message: userParsed.error });
      }
      filter.user = userParsed.value;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', USER_POPULATE),
      Order.countDocuments(filter),
    ]);

    const data = orders.map((doc) => {
      const json = formatOrder(doc);
      if (doc.user && typeof doc.user === 'object') {
        json.user = {
          id: String(doc.user._id),
          name: doc.user.name,
          email: doc.user.email,
        };
      }
      return json;
    });

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/:id — 주문 단건 (관리자 Read) */
async function getOrderById(req, res, next) {
  try {
    const parsed = parseObjectId(req.params.id, '주문 id');
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findById(parsed.value).populate('user', USER_POPULATE);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const json = formatOrder(order);
    if (order.user && typeof order.user === 'object') {
      json.user = {
        id: String(order.user._id),
        name: order.user.name,
        email: order.user.email,
      };
    }

    res.json({ data: json });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/orders/:id — 주문 상태·배송·결제 수정 (관리자 Update) */
async function updateOrder(req, res, next) {
  try {
    const parsed = parseObjectId(req.params.id, '주문 id');
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findById(parsed.value);
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (body.status !== undefined) {
      const status = trimStr(String(body.status));
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `status는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.`,
        });
      }
      order.status = status;
      if (status === 'cancelled' && !order.cancelledAt) {
        order.cancelledAt = new Date();
      }
    }

    if (body.shipping !== undefined) {
      if (!body.shipping || typeof body.shipping !== 'object') {
        return res.status(400).json({ message: 'shipping은 객체여야 합니다.' });
      }
      const fields = [
        'recipientName',
        'phone',
        'postalCode',
        'addressLine1',
        'addressLine2',
        'deliveryMemo',
      ];
      for (const key of fields) {
        if (body.shipping[key] !== undefined) {
          order.shipping[key] = trimStr(String(body.shipping[key]));
        }
      }
    }

    if (body.payment !== undefined) {
      if (!body.payment || typeof body.payment !== 'object') {
        return res.status(400).json({ message: 'payment는 객체여야 합니다.' });
      }
      if (body.payment.status !== undefined) {
        const ps = trimStr(String(body.payment.status));
        if (!PAYMENT_STATUSES.includes(ps)) {
          return res.status(400).json({
            message: `payment.status는 ${PAYMENT_STATUSES.join(', ')} 중 하나여야 합니다.`,
          });
        }
        order.payment.status = ps;
        if (ps === 'paid' && !order.payment.paidAt) {
          order.payment.paidAt = new Date();
        }
      }
      if (body.payment.transactionId !== undefined) {
        order.payment.transactionId = trimStr(String(body.payment.transactionId));
      }
      if (body.payment.method !== undefined) {
        const method = trimStr(String(body.payment.method));
        if (!PAYMENT_METHODS.includes(method)) {
          return res.status(400).json({
            message: `payment.method는 ${PAYMENT_METHODS.join(', ')} 중 하나여야 합니다.`,
          });
        }
        order.payment.method = method;
      }
    }

    if (body.shippingFee !== undefined) {
      const fee = Number(body.shippingFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return res.status(400).json({ message: 'shippingFee는 0 이상이어야 합니다.' });
      }
      order.shippingFee = fee;
    }

    if (body.cancelReason !== undefined) {
      order.cancelReason = trimStr(String(body.cancelReason));
    }

    await order.save();
    res.json({ data: formatOrder(order) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/orders/:id — 주문 삭제 (관리자 Delete) */
async function deleteOrder(req, res, next) {
  try {
    const parsed = parseObjectId(req.params.id, '주문 id');
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const order = await Order.findByIdAndDelete(parsed.value);
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    res.json({ message: '주문이 삭제되었습니다.', data: formatOrder(order) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMyOrder,
  listMyOrders,
  getMyOrderById,
  cancelMyOrder,
  listOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
