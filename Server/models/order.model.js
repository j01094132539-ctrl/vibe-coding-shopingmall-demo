const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('./product.model');

/** 주문·배송 상태 — `GET /api/orders` 목록·상세 필터용 */
const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
];

/** 결제 상태 — PG 연동 전 데모·실결제 공통 */
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

/** 결제 수단 — 데모는 `demo`, 추후 PG 확장 */
const PAYMENT_METHODS = ['card', 'transfer', 'kakao', 'naver', 'demo'];

/** 주문 상품 한 줄 — 주문 시점 상품 정보 스냅샷 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품(product)은 필수입니다.'],
    },
    sku: {
      type: String,
      required: [true, 'sku는 필수입니다.'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, '상품 이름은 필수입니다.'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, '이미지는 필수입니다.'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: `카테고리는 ${PRODUCT_CATEGORIES.join(', ')} 중 하나여야 합니다.`,
      },
    },
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      min: [1, '수량은 1 이상이어야 합니다.'],
    },
    unitPrice: {
      type: Number,
      required: [true, '단가는 필수입니다.'],
      min: [0, '단가는 0 이상이어야 합니다.'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'lineTotal은 필수입니다.'],
      min: [0, 'lineTotal은 0 이상이어야 합니다.'],
    },
  },
  { _id: true }
);

/** 배송지 스냅샷 — 체크아웃 시 입력값을 주문에 고정 저장 */
const shippingSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, '수령인 이름은 필수입니다.'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, '연락처는 필수입니다.'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, '우편번호는 필수입니다.'],
      trim: true,
    },
    addressLine1: {
      type: String,
      required: [true, '주소는 필수입니다.'],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    deliveryMemo: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

/** 결제 정보 — `payment.status`와 주문 `status` 분리 */
const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: [true, '결제 수단은 필수입니다.'],
      enum: {
        values: PAYMENT_METHODS,
        message: `결제 수단은 ${PAYMENT_METHODS.join(', ')} 중 하나여야 합니다.`,
      },
    },
    status: {
      type: String,
      required: [true, '결제 상태는 필수입니다.'],
      enum: {
        values: PAYMENT_STATUSES,
        message: `결제 상태는 ${PAYMENT_STATUSES.join(', ')} 중 하나여야 합니다.`,
      },
      default: 'pending',
    },
    paidAt: {
      type: Date,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    /** 포트원 `merchant_uid` — imp_uid와 함께 중복 주문 방지 */
    merchantUid: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, '결제 금액은 필수입니다.'],
      min: [0, '결제 금액은 0 이상이어야 합니다.'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, '주문번호(orderNumber)는 필수입니다.'],
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자(user)는 필수입니다.'],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: '주문 상품이 1개 이상 있어야 합니다.',
      },
    },
    shipping: {
      type: shippingSchema,
      required: [true, '배송지(shipping)는 필수입니다.'],
    },
    payment: {
      type: paymentSchema,
      required: [true, '결제(payment)는 필수입니다.'],
    },
    status: {
      type: String,
      required: [true, '주문 상태(status)는 필수입니다.'],
      enum: {
        values: ORDER_STATUSES,
        message: `주문 상태는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.`,
      },
      default: 'pending_payment',
    },
    subtotal: {
      type: Number,
      required: [true, 'subtotal은 필수입니다.'],
      min: [0, 'subtotal은 0 이상이어야 합니다.'],
      default: 0,
    },
    shippingFee: {
      type: Number,
      required: [true, 'shippingFee는 필수입니다.'],
      min: [0, 'shippingFee는 0 이상이어야 합니다.'],
      default: 0,
    },
    totalItems: {
      type: Number,
      min: [0, 'totalItems는 0 이상이어야 합니다.'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'totalAmount는 필수입니다.'],
      min: [0, 'totalAmount는 0 이상이어야 합니다.'],
      default: 0,
    },
    sourceCart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
    },
    /** 취소 시각 — 관리자 주문 목록 `/admin/orders` 취소 정보 패널·API 응답에 포함 */
    cancelledAt: {
      type: Date,
    },
    /** 취소 사유 — 관리자·사용자 취소 시 저장, 관리자 목록에서 표시 */
    cancelReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

/** items·shippingFee로 lineTotal·subtotal·totalItems·totalAmount 계산 */
function recalculateOrderTotals(items, shippingFee = 0) {
  let totalItems = 0;
  let subtotal = 0;
  const normalizedItems = [];

  for (const item of items || []) {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    if (!Number.isFinite(qty) || qty < 1) continue;

    const lineTotal =
      Number.isFinite(price) && price >= 0 ? Math.round(qty * price) : 0;
    totalItems += qty;
    subtotal += lineTotal;

    normalizedItems.push({
      ...item,
      quantity: qty,
      unitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
      lineTotal,
    });
  }

  const fee = Number.isFinite(Number(shippingFee)) && Number(shippingFee) >= 0
    ? Number(shippingFee)
    : 0;

  return {
    items: normalizedItems,
    totalItems,
    subtotal,
    shippingFee: fee,
    totalAmount: subtotal + fee,
  };
}

/** `ORD-YYYYMMDD-####` 형식 주문번호 — 컨트롤러·시드에서 사용 */
function formatOrderNumber(date, sequence) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `ORD-${y}${m}${day}-${seq}`;
}

// 저장 전 라인·합계 금액 동기화, payment.amount = totalAmount
orderSchema.pre('save', function syncOrderTotals(next) {
  const totals = recalculateOrderTotals(this.items, this.shippingFee);
  this.items = totals.items;
  this.totalItems = totals.totalItems;
  this.subtotal = totals.subtotal;
  this.shippingFee = totals.shippingFee;
  this.totalAmount = totals.totalAmount;

  if (this.payment != null) {
    this.payment.amount = totals.totalAmount;
  }

  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
// imp_uid·merchant_uid 중복 주문 방지 — `order.controller` createMyOrder
orderSchema.index(
  { 'payment.transactionId': 1 },
  { unique: true, sparse: true }
);
orderSchema.index(
  { 'payment.merchantUid': 1 },
  { unique: true, sparse: true }
);

orderSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;

    if (Array.isArray(ret.items)) {
      ret.items = ret.items.map((item) => {
        const row = { ...item };
        if (row._id != null) {
          row.id = row._id;
          delete row._id;
        }
        if (row.product != null) {
          row.product = String(row.product);
        }
        return row;
      });
    }

    if (ret.user != null) ret.user = String(ret.user);
    if (ret.sourceCart != null) ret.sourceCart = String(ret.sourceCart);

    return ret;
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.recalculateOrderTotals = recalculateOrderTotals;
module.exports.formatOrderNumber = formatOrderNumber;
