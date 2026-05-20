const User = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password');
const { signLoginToken } = require('../utils/jwt');

/** JWT `sub`로 DB에서 최신 프로필 조회 — `GET /api/users/me` + `authenticate` 미들웨어 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { email, name, password, user_type, address } = body;

    const doc = {
      email,
      name,
      user_type: user_type === 'admin' ? 'admin' : 'customer',
    };

    if (address != null && String(address).trim() !== '') {
      doc.address = String(address).trim();
    }

    if (typeof password === 'string' && password.length > 0) {
      doc.password = await hashPassword(password);
    }

    const user = await User.create(doc);
    res.status(201).json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const updates = { ...req.body };
    if (updates.password === '') {
      delete updates.password;
    } else if (typeof updates.password === 'string' && updates.password.length > 0) {
      updates.password = await hashPassword(updates.password);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted', data: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

/** 이메일·비밀번호 로그인 — `POST /api/users/login` → `user.routes` */
async function login(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawEmail = body.email;
    const rawPassword = body.password;

    // 스키마와 동일하게 이메일 정규화(소문자·trim) 후 조회
    const email =
      typeof rawEmail === 'string' && rawEmail.trim() !== ''
        ? rawEmail.trim().toLowerCase()
        : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해 주세요.' });
    }

    const user = await User.findOne({ email });
    // 계정 존재 여부·비밀번호 오류를 구분하지 않음(정보 노출 완화)
    const sameMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';

    if (!user) {
      return res.status(401).json({ message: sameMessage });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: sameMessage });
    }

    // JWT 토큰 발급 — 페이로드·만료·비밀키는 `utils/jwt.js` + `JWT_SECRET` / `JWT_EXPIRES`
    const token = signLoginToken(user);

    // `user.toJSON()` 스키마 transform으로 비밀번호는 응답에서 제외
    res.json({
      message: '로그인에 성공했습니다.',
      data: user.toJSON(),
      token,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  login,
};
