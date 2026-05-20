const Product = require('../models/product.model');

const PRODUCT_CATEGORIES = Product.PRODUCT_CATEGORIES;

/** 요청 본문에서 상품 필드 추출·검증 */
function buildProductPayload(body, { partial = false } = {}) {
  const src = body && typeof body === 'object' ? body : {};
  const payload = {};
  const missing = [];

  if (!partial || src.sku !== undefined) {
    const sku = typeof src.sku === 'string' ? src.sku.trim() : '';
    if (!sku) missing.push('sku');
    else payload.sku = sku;
  }

  if (!partial || src.name !== undefined) {
    const name = typeof src.name === 'string' ? src.name.trim() : '';
    if (!name) missing.push('name');
    else payload.name = name;
  }

  if (!partial || src.price !== undefined) {
    const price = Number(src.price);
    if (!Number.isFinite(price)) missing.push('price');
    else if (price < 0) {
      // Mongo 스키마 `min: 0` 전에 API에서 명확히 거절
      const err = new Error('상품 가격은 0 이상이어야 합니다.');
      err.statusCode = 400;
      throw err;
    } else payload.price = price;
  }

  if (!partial || src.category !== undefined) {
    const category = typeof src.category === 'string' ? src.category.trim() : '';
    if (!category) missing.push('category');
    else if (!PRODUCT_CATEGORIES.includes(category)) {
      const err = new Error(
        `카테고리는 ${PRODUCT_CATEGORIES.join(', ')} 중 하나여야 합니다.`
      );
      err.statusCode = 400;
      throw err;
    } else payload.category = category;
  }

  if (!partial || src.image !== undefined) {
    const image = typeof src.image === 'string' ? src.image.trim() : '';
    if (!image) missing.push('image');
    else payload.image = image;
  }

  if (src.description !== undefined) {
    payload.description =
      src.description == null ? '' : String(src.description).trim();
  }

  if (!partial && missing.length > 0) {
    const err = new Error(`필수 항목이 누락되었습니다: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (partial && missing.length > 0) {
    const err = new Error(`유효하지 않은 값입니다: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return payload;
}

/** GET /api/products — 목록 (`?category=`, `?search=`, 페이지네이션 `?page=&limit=` 기본 limit 2) */
async function listProducts(req, res, next) {
  try {
    const filter = {};
    const rawCategory = req.query.category;
    if (typeof rawCategory === 'string' && rawCategory.trim() !== '') {
      const category = rawCategory.trim();
      if (!PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({
          message: `카테고리는 ${PRODUCT_CATEGORIES.join(', ')} 중 하나여야 합니다.`,
        });
      }
      filter.category = category;
    }

    const rawSearch = req.query.search;
    if (typeof rawSearch === 'string' && rawSearch.trim() !== '') {
      const escaped = rawSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    let page = Number.parseInt(String(req.query.page ?? '1'), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number.parseInt(String(req.query.limit ?? '2'), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 2;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    // lean 문서에 `id` 문자열 추가 — 클라이언트 상세 링크·`GET /:id`와 동일 형식
    const data = products.map((doc) => ({
      ...doc,
      id: String(doc._id),
    }));

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    res.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/products/:id — 단건 조회 */
async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json({ data: { ...product, id: String(product._id) } });
  } catch (err) {
    next(err);
  }
}

/** POST /api/products — 상품 등록 (`product.routes`에서 관리자만 통과) */
async function createProduct(req, res, next) {
  try {
    const payload = buildProductPayload(req.body);
    const product = await Product.create(payload);
    res.status(201).json({ data: product.toJSON() });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.sku) {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }
    next(err);
  }
}

/** PUT /api/products/:id — 상품 수정 (관리자) */
async function updateProduct(req, res, next) {
  try {
    const payload = buildProductPayload(req.body, { partial: true });
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: '수정할 필드를 보내 주세요.' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json({ data: product.toJSON() });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.sku) {
      return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
    }
    next(err);
  }
}

/** DELETE /api/products/:id — 상품 삭제 (관리자) */
async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json({ message: '상품이 삭제되었습니다.', data: product.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
