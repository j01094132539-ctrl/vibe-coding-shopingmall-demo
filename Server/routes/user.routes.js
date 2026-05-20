const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.get('/', userController.listUsers);
// `/:id`보다 먼저 등록 — `login`, `me`가 id로 해석되지 않도록
router.post('/login', userController.login);
router.get('/me', authenticate, userController.getMe);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
