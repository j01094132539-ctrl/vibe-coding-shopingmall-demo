const { verifyAccessToken } = require('../utils/jwt');

/**
 * `Authorization: Bearer <JWT>` 검증 후 `req.auth`에 사용자 식별 정보 설정
 */
function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        message: '인증이 필요합니다. Authorization: Bearer <토큰> 형식으로 보내 주세요.',
      });
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ message: '토큰이 비어 있습니다.' });
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.sub != null ? String(decoded.sub) : '';
    if (!userId) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    req.auth = {
      userId,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      user_type: decoded.user_type === 'admin' || decoded.user_type === 'customer' ? decoded.user_type : undefined,
    };

    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    }
    if (err && err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    next(err);
  }
}

module.exports = authenticate;
