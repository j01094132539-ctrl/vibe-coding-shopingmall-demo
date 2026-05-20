const mongoose = require('mongoose');

/** 상품 카테고리 — `POST /api/products` 등록 시 허용 값 */
const PRODUCT_CATEGORIES = ['상의', '하의', '악세사리'];

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'sku는 필수입니다.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, '상품 이름은 필수입니다.'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, '상품 가격은 필수입니다.'],
      min: [0, '상품 가격은 0 이상이어야 합니다.'],
    },
    category: {
      type: String,
      required: [true, '카테고리는 필수입니다.'],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: `카테고리는 ${PRODUCT_CATEGORIES.join(', ')} 중 하나여야 합니다.`,
      },
    },
    image: {
      type: String,
      required: [true, '이미지는 필수입니다.'],
      trim: true,
    },
    // 설명 — 필수 아님, 미입력 시 빈 문자열
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

productSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
