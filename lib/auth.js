// lib/auth.js
// ─────────────────────────────────────────────────────────────
// Mirrors the Android hashing contract exactly:
//   salt = reverse(username) + "LifeGrowth_2024"
//   hash = SHA-256(password + salt)   → lowercase hex
// ─────────────────────────────────────────────────────────────
import crypto from "crypto";

/**
 * Reproduce the Android salt derivation.
 * @param {string} username
 */
export function deriveSalt(username) {
  const reversed = username.split("").reverse().join("");
  return reversed + "LifeGrowth_2024";
}

/**
 * Hash a plaintext password the same way the Android app does.
 * Call this on the SERVER when you need to verify a password you
 * received in plain-text form (e.g., during local testing).
 *
 * In production the Android app sends the already-hashed value,
 * so the server just compares hashes directly — see verifyHash().
 *
 * @param {string} password
 * @param {string} username
 * @returns {string}  64-char lowercase hex SHA-256
 */
export function hashPassword(password, username) {
  const salt = deriveSalt(username);
  return crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks.
 * Both arguments must be 64-char hex strings.
 */
export function verifyHash(incoming, stored) {
  if (typeof incoming !== "string" || incoming.length !== 64) return false;
  if (typeof stored   !== "string" || stored.length   !== 64) return false;
  return crypto.timingSafeEqual(
    Buffer.from(incoming, "hex"),
    Buffer.from(stored,   "hex")
  );
}
