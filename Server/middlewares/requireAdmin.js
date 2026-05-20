const User = require('../models/user.model');

/**
 * `authenticate` 이후 — DB `user_type`으로 관리자 확인
 * JWT 클레임만 보면 DB에서 admin으로 바뀐 뒤 재로그인 전에 403이 날 수 있음
 */
async function requireAdmin(req, res, next) {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const user = await User.findById(userId).select('user_type').lean();
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    req.auth.user_type = 'admin';
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAdmin;
