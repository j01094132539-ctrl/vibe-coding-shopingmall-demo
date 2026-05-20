const mongoose = require('mongoose');

/** 장바구니 한 줄 — 상품·수량·옵션(색상/사이즈) */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품(product)은 필수입니다.'],
    },
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      min: [1, '수량은 1 이상이어야 합니다.'],
      default: 1,
    },
    // 담을 당시 단가 스냅샷 — 상품 가격 변경 시에도 주문 금액 기준용
    unitPrice: {
      type: Number,
      min: [0, '단가는 0 이상이어야 합니다.'],
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자(user)는 필수입니다.'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    // items 합산 — `pre('save')`에서 quantity·unitPrice 기준으로 갱신
    totalItems: {
      type: Number,
      min: [0, 'totalItems는 0 이상이어야 합니다.'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      min: [0, 'totalAmount는 0 이상이어야 합니다.'],
      default: 0,
    },
  },
  { timestamps: true }
);

/** items 배열로 총 수량·총 금액 계산 */
function recalculateCartTotals(items) {
  let totalItems = 0;
  let totalAmount = 0;
  for (const item of items || []) {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    if (!Number.isFinite(qty) || qty < 1) continue;
    totalItems += qty;
    if (Number.isFinite(price) && price >= 0) {
      totalAmount += qty * price;
    }
  }
  return { totalItems, totalAmount };
}

// 저장 전 totalItems / totalAmount 동기화
cartSchema.pre('save', function syncCartTotals(next) {
  const totals = recalculateCartTotals(this.items);
  this.totalItems = totals.totalItems;
  this.totalAmount = totals.totalAmount;
  next();
});

// 사용자별 장바구니 조회 — `GET /api/carts/me` 등에서 사용
cartSchema.index({ user: 1 });

cartSchema.set('toJSON', {
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
        // populate된 product는 객체로 유지 — 장바구니 UI에서 이름·이미지 표시
        if (row.product != null && typeof row.product === 'object') {
          const p = row.product;
          row.product = {
            id: p._id != null ? String(p._id) : p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            category: p.category,
            sku: p.sku,
          };
        } else if (row.product != null) {
          row.product = String(row.product);
        }
        return row;
      });
    }
    if (ret.user != null) ret.user = String(ret.user);
    return ret;
  },
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
module.exports.recalculateCartTotals = recalculateCartTotals;
