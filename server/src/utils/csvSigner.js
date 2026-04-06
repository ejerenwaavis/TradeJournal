const crypto = require('crypto');

/**
 * Sign a plain object row with HMAC-SHA256.
 * The signature is computed over the stable JSON of the row (keys sorted).
 */
function signRow(rowObject, secretKey) {
  const sorted = Object.keys(rowObject)
    .sort()
    .reduce((acc, k) => { acc[k] = rowObject[k]; return acc; }, {});
  return crypto.createHmac('sha256', secretKey).update(JSON.stringify(sorted)).digest('hex');
}

/**
 * Verify a row:  strip the _sig field, recompute, compare.
 */
function verifyRow(rowWithSig, secretKey) {
  const { _sig, ...row } = rowWithSig;
  if (!_sig) return false;
  return signRow(row, secretKey) === _sig;
}

module.exports = { signRow, verifyRow };
