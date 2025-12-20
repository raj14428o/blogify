const express = require("express");
const router = express.Router();
const User = require("../Models/user");

// Messages list page
router.get("/", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  const user = await User.findById(req.user._id)
    .populate("following", "_id fullName profileImageUrl")
    .lean();

  res.render("messages", {
    following: user.following,   //  IMPORTANT
    user: req.user
  });
});


// Individual chat page

//search users to message
router.get("/search", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ users: [] });
  }

  const q = req.query.q?.trim();
  if (!q || q.length < 2) {
    return res.json({ users: [] });
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    fullName: { $regex: q, $options: "i" }
  })
    .select("_id fullName profileImageUrl")
    .limit(10)
    .lean();

  res.json({ users });
});

router.get("/:userId", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  const otherUser = await User.findById(req.params.userId)
    .select("_id fullName profileImageUrl")
    .lean();

  if (!otherUser) return res.redirect("/messages");

  res.render("chat", {
    otherUser,
    user: req.user
  });
});



module.exports = router;
