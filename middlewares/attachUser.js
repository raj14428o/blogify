const User = require("../Models/user");
const { validateToken } = require("../services/authentication");

module.exports = async function attachUser(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = validateToken(token);

    const user = await User.findById(payload._id);
    if (!user) {
      res.clearCookie("token");
      req.user = null;
      return next();
    }

  
    if (user.activeSessionId !== payload.sessionId) {
      res.clearCookie("token");
      return res.redirect("/user/login");
    }

    // Attach safe user object
    req.user = {
      _id: user._id,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
    };

    return next();
  } catch (err) {
    res.clearCookie("token");
    req.user = null;
  }
};

