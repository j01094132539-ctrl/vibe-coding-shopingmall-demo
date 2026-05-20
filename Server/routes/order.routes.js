/**
 * 주문 API — `index.js`에서 `/api/orders`로 마운트.
 * 고객: JWT `authenticate` · `/me` 경로
 * 관리자: `requireAdmin` — 전체 CRUD `GET/PUT/DELETE /api/orders/:id`
 */
const express = require('express');
const orderController = require('../controllers/order.controller');
const authenticate = require('../middlewares/authenticate');
const requireAdmin = require('../middlewares/requireAdmin');

const router = express.Router();

// `/me`는 `/:id`보다 먼저 — ObjectId 라우트와 충돌 방지
router.post('/me', authenticate, orderController.createMyOrder);
router.get('/me', authenticate, orderController.listMyOrders);
router.get('/me/:id', authenticate, orderController.getMyOrderById);
router.patch('/me/:id/cancel', authenticate, orderController.cancelMyOrder);

// 관리자 주문 CRUD
router.get('/', authenticate, requireAdmin, orderController.listOrders);
router.get('/:id', authenticate, requireAdmin, orderController.getOrderById);
router.put('/:id', authenticate, requireAdmin, orderController.updateOrder);
router.delete('/:id', authenticate, requireAdmin, orderController.deleteOrder);

module.exports = router;
