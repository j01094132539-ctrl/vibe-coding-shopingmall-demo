const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const { recalculateCartTotals } = require('../models/cart.model');
const Product = require('../models/product.model');

const PRODUCT_POPULATE = 'name price image category sku';

function formatCart(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/** 로그인 사용자 장바구니 조회·생성 */
async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

function parseProductId(body) {
  const raw = body?.product ?? body?.productId;
  if (raw == null || String(raw).trim() === '') return null;
  const id = String(raw).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

function parseQuantity(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : 1;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

/** GET /api/carts/me — 내 장바구니 조회 */
async function getMyCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.auth.userId }).populate(
      'items.product',
      PRODUCT_POPULATE
    );

    if (!cart) {
      return res.json({
        data: {
          user: req.auth.userId,
          items: [],
          totalItems: 0,
          totalAmount: 0,
        },
      });
    }

    res.json({ data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/carts/me/items — 상품 담기 (Create) */
async function addCartItem(req, res, next) {
  try {
    const productId = parseProductId(req.body);
    if (!productId) {
      return res.status(400).json({ message: 'product(또는 productId)가 필요합니다.' });
    }

    const quantity = parseQuantity(req.body?.quantity, { required: true });
    if (quantity == null) {
      return res.status(400).json({ message: 'quantity는 1 이상의 정수여야 합니다.' });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    const cart = await findOrCreateCart(req.auth.userId);
    const existing = cart.items.find(
      (line) => String(line.product) === String(productId)
    );

    if (existing) {
      existing.quantity += quantity;
      if (product.price != null) existing.unitPrice = product.price;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        unitPrice: product.price,
      });
    }

    const totals = recalculateCartTotals(cart.items);
    cart.totalItems = totals.totalItems;
    cart.totalAmount = totals.totalAmount;
    await cart.save();

    await cart.populate('items.product', PRODUCT_POPULATE);
    res.status(201).json({ data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/carts/me/items/:itemId — 줄 수량·단가 수정 (Update) */
async function updateCartItem(req, res, next) {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: '유효하지 않은 itemId입니다.' });
    }

    const cart = await Cart.findOne({ user: req.auth.userId });
    if (!cart) {
      return res.status(404).json({ message: '장바구니가 없습니다.' });
    }

    const line = cart.items.id(itemId);
    if (!line) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    if (req.body?.quantity !== undefined) {
      const quantity = parseQuantity(req.body.quantity, { required: true });
      if (quantity == null) {
        return res.status(400).json({ message: 'quantity는 1 이상의 정수여야 합니다.' });
      }
      line.quantity = quantity;
    }

    if (req.body?.unitPrice !== undefined) {
      const unitPrice = Number(req.body.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ message: 'unitPrice는 0 이상이어야 합니다.' });
      }
      line.unitPrice = unitPrice;
    }

    const totals = recalculateCartTotals(cart.items);
    cart.totalItems = totals.totalItems;
    cart.totalAmount = totals.totalAmount;
    await cart.save();

    await cart.populate('items.product', PRODUCT_POPULATE);
    res.json({ data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/carts/me/items/:itemId — 항목 삭제 */
async function removeCartItem(req, res, next) {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: '유효하지 않은 itemId입니다.' });
    }

    const cart = await Cart.findOne({ user: req.auth.userId });
    if (!cart) {
      return res.status(404).json({ message: '장바구니가 없습니다.' });
    }

    const line = cart.items.id(itemId);
    if (!line) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    line.deleteOne();
    const totals = recalculateCartTotals(cart.items);
    cart.totalItems = totals.totalItems;
    cart.totalAmount = totals.totalAmount;
    await cart.save();

    await cart.populate('items.product', PRODUCT_POPULATE);
    res.json({ data: formatCart(cart), message: '항목이 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/carts/me — 장바구니 비우기 */
async function clearMyCart(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.auth.userId });
    if (!cart) {
      return res.json({
        data: { items: [], totalItems: 0, totalAmount: 0 },
        message: '장바구니가 비어 있습니다.',
      });
    }

    cart.items = [];
    cart.totalItems = 0;
    cart.totalAmount = 0;
    await cart.save();

    res.json({ data: formatCart(cart), message: '장바구니를 비웠습니다.' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/carts — 전체 장바구니 목록 (관리자) */
async function listCarts(req, res, next) {
  try {
    const carts = await Cart.find()
      .sort({ updatedAt: -1 })
      .populate('user', 'name email')
      .populate('items.product', PRODUCT_POPULATE)
      .lean();

    const data = carts.map((doc) => ({
      ...doc,
      id: String(doc._id),
      user: doc.user && typeof doc.user === 'object' ? { ...doc.user, id: String(doc.user._id) } : doc.user,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/carts/:id — 장바구니 단건 (관리자) */
async function getCartById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 장바구니 id입니다.' });
    }

    const cart = await Cart.findById(id)
      .populate('user', 'name email')
      .populate('items.product', PRODUCT_POPULATE);

    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    res.json({ data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/carts/:id — 장바구니 items 전체 교체 (관리자) */
async function updateCart(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 장바구니 id입니다.' });
    }

    const src = req.body?.items;
    if (!Array.isArray(src)) {
      return res.status(400).json({ message: 'items 배열이 필요합니다.' });
    }

    const nextItems = [];
    for (const row of src) {
      const productId = parseProductId(row);
      const quantity = parseQuantity(row?.quantity, { required: true });
      if (!productId || quantity == null) {
        return res.status(400).json({
          message: '각 항목에 product와 quantity(1 이상 정수)가 필요합니다.',
        });
      }

      const product = await Product.findById(productId).select('price').lean();
      if (!product) {
        return res.status(404).json({ message: `상품을 찾을 수 없습니다: ${productId}` });
      }

      let unitPrice = product.price;
      if (row.unitPrice !== undefined) {
        const p = Number(row.unitPrice);
        if (!Number.isFinite(p) || p < 0) {
          return res.status(400).json({ message: 'unitPrice는 0 이상이어야 합니다.' });
        }
        unitPrice = p;
      }

      nextItems.push({ product: productId, quantity, unitPrice });
    }

    const totals = recalculateCartTotals(nextItems);
    const cart = await Cart.findByIdAndUpdate(
      id,
      {
        items: nextItems,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
      },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('items.product', PRODUCT_POPULATE);

    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    res.json({ data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/carts/:id — 장바구니 문서 삭제 (관리자) */
async function deleteCart(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 장바구니 id입니다.' });
    }

    const cart = await Cart.findByIdAndDelete(id);
    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    res.json({ message: '장바구니가 삭제되었습니다.', data: formatCart(cart) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearMyCart,
  listCarts,
  getCartById,
  updateCart,
  deleteCart,
};
