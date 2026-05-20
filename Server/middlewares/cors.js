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

function isVercelAppOrigin(origin) {
  try {
    const host = new URL(origin).hostname;
    return host === 'vercel.app' || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

/** `CORS_ALLOW_VERCEL=false`가 아니면 프로덕션(Heroku)에서 *.vercel.app 기본 허용 */
function shouldAllowVercelOrigins() {
  if (process.env.CORS_ALLOW_VERCEL === 'false') return false;
  if (process.env.CORS_ALLOW_VERCEL === 'true') return true;
  return process.env.NODE_ENV === 'production';
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (shouldAllowVercelOrigins() && isVercelAppOrigin(origin)) return true;
  return false;
}

/** Vercel → Heroku `fetch`용 — `Authorization` 등 preflight 허용 */
function createCorsMiddleware() {
  const allowed = parseCorsOrigins();
  const allowVercel = shouldAllowVercelOrigins();
  if (process.env.NODE_ENV === 'production') {
    console.log(
      `CORS: NODE_ENV=production, vercel.app=${allowVercel}, explicit=${allowed.filter((o) => !DEFAULT_ORIGINS.includes(o)).join(', ') || '(none)'}`
    );
  }
  return cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, allowed));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
}

module.exports = createCorsMiddleware;
