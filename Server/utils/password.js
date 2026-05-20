const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

/**
 * @param {string} plainText
 * @returns {Promise<string>}
 */
async function hashPassword(plainText) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new TypeError('Password must be a non-empty string');
  }
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * @param {string} plainText
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
// 로그인 시 DB에 저장된 bcrypt 해시와 평문 비밀번호 비교
async function comparePassword(plainText, hash) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    return false;
  }
  if (typeof hash !== 'string' || hash.length === 0) {
    return false;
  }
  return bcrypt.compare(plainText, hash);
}

module.exports = { hashPassword, comparePassword };
