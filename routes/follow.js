const {Router} = require('express')
const router = Router();

const requireApiLogin = require("../middlewares/requireApiLogin");
const { toggleFollow,getFollowers,getFollowing } = require("../controllers/followController");

router.post("/users/:id/toggle-follow", requireApiLogin, toggleFollow);
router.get("/test", requireApiLogin, (req, res) => {
  res.json({ user: req.user });
});
router.get("/users/:id/followers", requireApiLogin, getFollowers);
router.get("/users/:id/following", requireApiLogin, getFollowing);

module.exports = router;
