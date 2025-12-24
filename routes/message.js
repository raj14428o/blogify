const express = require("express");
const router = express.Router();
const User = require("../Models/user");
const getRoomId = require("../utils/chatroom");
const authMiddleware = require("../middlewares/attachUser");
const Message = require("../Models/message");
const Conversation = require("../Models/conversation");
const mongoose = require('mongoose');

// routes/message.js
router.get("/conversations", async (req, res) => {
 
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const conversations = await Conversation.find({
    members: { $in: [userId] },   
  })
    .sort({ lastMessageAt: -1 })
    .populate("members", "fullName profileImageUrl")
    .lean();

  res.json({ conversations });
});
router.post("/clear-unread", authMiddleware, async (req, res) => {
  const { roomId } = req.body;

  await Conversation.updateOne(
    { roomId },
    {
      $set: {
        [`unreadCount.${req.user._id}`]: 0
      }
    }
  );

  res.json({ success: true });
});

// Messages list page
router.get("/", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  const user = await User.findById(req.user._id)
    .populate("following", "_id fullName profileImageUrl")
    .lean();

  res.render("messages", {
    following: user.following, 
    user: req.user,
    roomId: null,   
    chatUser: null ,
  });
});


// Individual chat page
router.get("/room/:roomId", async (req, res) => {
  if (!req.user) return res.redirect("/user/signin");

  const { roomId } = req.params;

  const ids = roomId.split("_");
  if (ids.length !== 2) {
    return res.redirect("/messages");
  }

  const otherUserId =
    ids[0] === req.user._id.toString() ? ids[1] : ids[0];

  const otherUser = await User.findById(otherUserId)
    .select("_id fullName profileImageUrl isOnline lastSeen")
    .lean();

  if (!otherUser) return res.redirect("/messages");

  // reuse messages page → right pane chat
  const user = await User.findById(req.user._id)
    .populate("following", "_id fullName profileImageUrl")
    .lean();

  res.render("messages", {
    following: user.following,
    user: req.user,
    roomId,
    chatUser: otherUser
  });
});

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


router.get("/:roomId", authMiddleware, async (req, res) => {
  const { roomId } = req.params;

  const messages = await Message.find({ roomId })
    .sort({ createdAt: 1 })
    .select("sender ciphertext nonce createdAt readAt");

  res.json(messages);
});



module.exports = router;
