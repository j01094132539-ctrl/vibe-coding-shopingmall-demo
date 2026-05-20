/**
 * 장바구니 API — `index.js`에서 `/api/carts`로 마운트.
 * 본인: JWT `authenticate` · 관리자 전체 CRUD: `requireAdmin`
 */
const express = require('express');
const cartController = require('../controllers/cart.controller');
const authenticate = require('../middlewares/authenticate');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

// `/me` 경로는 `/:id`보다 먼저 — ObjectId와 충돌 방지
router.get('/me', authenticate, cartController.getMyCart);
router.post('/me/items', authenticate, cartController.addCartItem);
router.put('/me/items/:itemId', authenticate, cartController.updateCartItem);
router.delete('/me/items/:itemId', authenticate, cartController.removeCartItem);
router.delete('/me', authenticate, cartController.clearMyCart);

// 관리자 장바구니 CRUD
router.get('/', authenticate, requireAdmin, cartController.listCarts);
router.get('/:id', authenticate, requireAdmin, cartController.getCartById);
router.put('/:id', authenticate, requireAdmin, cartController.updateCart);
router.delete('/:id', authenticate, requireAdmin, cartController.deleteCart);

module.exports = router;
