// middlewares/auth.js

function isLoggedIn(req, res, next) {
  if (!req.user) {
    return res.redirect("/user/login");
  }
  next();
}

module.exports = {
  isLoggedIn,
};
