const jwt = require("jsonwebtoken");
const { isBlocked } = require("../utils/blocklist");

// Verifies the jwt cookie. If valid and not blocklisted, attaches
// req.user and calls next(). Otherwise clears the cookie and redirects.
function requireAuth(req, res, next) {
  const token = req.cookies.jwt;

  if (!token || isBlocked(token)) {
    res.clearCookie("jwt");
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.user = decoded; // { id, username, role, iat, exp }
    req.token = token;
    next();
  } catch (err) {
    res.clearCookie("jwt");
    return res.redirect("/login");
  }
}

// For routes that behave differently if a user *happens* to be logged in,
// but don't require it (e.g. "/").
function attachUserIfPresent(req, res, next) {
  const token = req.cookies.jwt;

  if (!token || isBlocked(token)) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_KEY);
    req.token = token;
  } catch {
    req.user = null;
  }
  next();
}

// Restrict a route to one or more roles, e.g. requireRole("admin", "mentor")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send("Forbidden: insufficient role");
    }
    next();
  };
}

module.exports = { requireAuth, attachUserIfPresent, requireRole };
