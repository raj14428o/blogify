const {validateToken} = require ('../services/authentication')

module.exports = function attachUser(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = validateToken(token);

    // Attach ONLY what you need
    req.user = {
      _id: payload._id,
      email: payload.email,
      profileImageUrl: payload.profileImageUrl,
      role: payload.role
    };

  } catch (err) {
    req.user = null;
  }

  next();
};
