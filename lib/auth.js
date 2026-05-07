// lib/auth.js
// ─────────────────────────────────────────────────────────────
// Mirrors the Android hashing contract exactly:
//   salt = reverse(username) + "LifeGrowth_2024"
//   hash = SHA-256(password + salt)   → lowercase hex
//
// Uses Web Crypto API only — no Node.js crypto import needed.
// Works in Next.js App Router, Edge Runtime, and browser.
// ─────────────────────────────────────────────────────────────

/**
 * Reproduce the Android salt derivation.
 */
export function deriveSalt(username) {
  // Strip ALL spaces — must match Android app and browser hash exactly
  const clean = username.replace(/\s+/g, "").toLowerCase();
  const reversed = clean.split("").reverse().join("");
  return reversed + "LifeGrowth_2024";
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Pure JS — no Node crypto needed.
 */
export function verifyHash(incoming, stored) {
  if (typeof incoming !== "string" || incoming.length !== 64) return false;
  if (typeof stored   !== "string" || stored.length   !== 64) return false;

  let diff = 0;
  for (let i = 0; i < 64; i++) {
    diff |= incoming.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}
