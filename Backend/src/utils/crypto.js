const crypto = require('crypto');

// Constant-time hex signature comparison (resistant to timing attacks).
// Falls back to `false` on length mismatch instead of throwing.
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { timingSafeEqualHex };
