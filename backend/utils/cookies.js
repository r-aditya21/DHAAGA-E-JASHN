// Single source of truth for the auth cookie settings.
//
// If the frontend and the API live on different sites (e.g. Vercel + Render),
// browsers only send the cookie when SameSite=None; Secure. Set
// COOKIE_SAMESITE=none in that case. On one site / localhost keep the default.

const ALLOWED_SAMESITE = ["lax", "strict", "none"];

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const requested = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = ALLOWED_SAMESITE.includes(requested) ? requested : "lax";

  return {
    httpOnly: true,
    // SameSite=None is rejected by browsers unless the cookie is Secure.
    secure: isProduction || sameSite === "none",
    sameSite,
  };
};

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = { getCookieOptions, SESSION_MAX_AGE_MS };
