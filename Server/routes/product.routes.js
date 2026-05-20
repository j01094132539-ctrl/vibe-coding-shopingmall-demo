/**
 * 상품 API — `index.js`에서 `/api/products`로 마운트됨.
 * 목록: `GET /` — `?page`, `?limit`(기본 2), `?category`, `?search` + 응답 `meta`.
 * 등록: `POST /` 본문 `{ sku, name, price, category, image, description? }` + 관리자 JWT.
 */
const express = require('express');
const productController = require('../controllers/product.controller');
const authenticate = require('../middlewares/authenticate');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

// 전체 상품 조회 — 페이지네이션·검색은 `product.controller.listProducts` 쿼리로 처리
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
// 상품 등록 — 클라이언트 `POST /api/products` + `Authorization: Bearer` → `createProduct`
router.post('/', authenticate, requireAdmin, productController.createProduct);
router.put('/:id', authenticate, requireAdmin, productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);

module.exports = router;
