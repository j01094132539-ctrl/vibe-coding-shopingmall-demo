const dns = require('dns');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/shopping_mall_demo';

// Windows Node에서 querySrv ECONNREFUSED 방지 — mongoose 연결 전 공용 DNS 사용
const DNS_SERVERS = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (DNS_SERVERS.length) {
  dns.setServers(DNS_SERVERS);
}

/**
 * Atlas URI — `MONGODB_ATLAS_URL` 우선, 없으면 `MONGO_URI`·로컬
 */
function resolveMongoUri() {
  const atlas = (
    process.env.MONGODB_ATLAS_URL ||
    process.env.MONGODB_ALTAS_URL ||
    process.env.MONGODB_ALATS_URL ||
    ''
  ).trim();
  if (atlas) return { uri: atlas, source: 'MONGODB_ATLAS_URL' };
  const local = (process.env.MONGO_URI || '').trim();
  if (local) return { uri: local, source: 'MONGO_URI' };
  return { uri: LOCAL_MONGO_URI, source: 'local(default)' };
}

/** 로그용 — 비밀번호 마스킹 */
function maskMongoUri(uri) {
  if (typeof uri !== 'string') return '';
  return uri.replace(/:([^:@/]+)@/, ':****@');
}

module.exports = {
  LOCAL_MONGO_URI,
  resolveMongoUri,
  maskMongoUri,
};
