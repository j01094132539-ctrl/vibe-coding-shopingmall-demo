const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// dotenv 로드 직후 DNS 설정 — `config/mongo.js`가 mongoose보다 먼저 실행되어야 함
const {
  resolveMongoUri,
  maskMongoUri,
} = require('./config/mongo');

const express = require('express');
const mongoose = require('mongoose');

const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const createCorsMiddleware = require('./middlewares/cors');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const { uri: MONGO_URI, source: mongoSource } = resolveMongoUri();

// Heroku 프로덕션 — `JWT_SECRET` 없으면 로그인 500 (`utils/jwt.js`)
if (process.env.NODE_ENV === 'production' && !String(process.env.JWT_SECRET || '').trim()) {
  console.error(
    'FATAL: JWT_SECRET이 없습니다. Heroku Config Vars에 JWT_SECRET을 설정하고 재배포하세요.'
  );
  process.exit(1);
}

// Vercel(프론트) → Heroku(API) — `CORS_ORIGINS`·`CORS_ALLOW_VERCEL` (`middlewares/cors.js`)
app.use(createCorsMiddleware());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('쇼핑몰 데모 서버가 실행 중입니다.');
});

app.get('/api', (req, res) => {
  res.send('쇼핑몰 데모 서버가 실행 중입니다.');
});

// 사용자 API — `POST /api/users/login`(JWT), `GET /api/users/me`(Bearer 토큰으로 본인 조회)
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFound);
app.use(errorHandler);

// MongoDB 연결 성공 후 listen — 미연결 시 API 버퍼 타임아웃 방지
async function start() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB 연결 성공 (${mongoSource})`);
    console.log(maskMongoUri(MONGO_URI));
  } catch (err) {
    console.error('MongoDB 연결 실패:', err.message || err);
    if (String(err.message || '').includes('querySrv')) {
      console.error(
        '힌트: SRV DNS 오류입니다. MONGO_DNS_SERVERS(기본 1.1.1.1,8.8.8.8)를 확인하거나 ' +
          'Atlas Standard 연결 문자열(mongodb://)을 MONGODB_ATLAS_URL에 사용하세요.'
      );
    }
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  });
}

start();
