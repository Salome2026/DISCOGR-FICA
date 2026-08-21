// Shared by auth.ts, login-check, and trust-device — one name, one place,
// so the three spots that read/write this cookie can never drift apart.
export const TRUSTED_DEVICE_COOKIE = "vpo_td";
export const TRUSTED_DEVICE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // seconds
