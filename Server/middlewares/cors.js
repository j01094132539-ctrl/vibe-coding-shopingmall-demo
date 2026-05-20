const cors = require('cors');

/** 로컬 Vite — `CORS_ORIGINS`에 Vercel URL 추가 시 Heroku에서 Client 허용 */
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN || '';
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  // Vercel 프리뷰·프로덕션 — `CORS_ALLOW_VERCEL=true` 시 *.vercel.app 허용
  if (process.env.CORS_ALLOW_VERCEL === 'true') {
    try {
      const host = new URL(origin).hostname;
      if (host === 'vercel.app' || host.endsWith('.vercel.app')) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

/** Vercel → Heroku `fetch`용 — `credentials`·`Authorization` 헤더 허용 */
function createCorsMiddleware() {
  const allowed = parseCorsOrigins();
  return cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, allowed));
    },
    credentials: true,
  });
}

module.exports = createCorsMiddleware;
