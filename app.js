require('dotenv').config();
const express = require('express');
const http = require("http");
const methodOverride = require('method-override');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { Server } = require("socket.io");
const onlineUsers = new Map();
const offlineTimers = new Map();
const User = require("./Models/user");
const Message = require("./Models/message")
const attachUser = require('./middlewares/attachUser');
const Conversation = require("./Models/conversation");
const Blog = require('./Models/blog');
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
const followApiRoutes = require("./routes/follow");
const MessageRoute = require("./routes/message");
const deviceRoutes = require("./routes/device");
const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);
const roomPresence = new Map();

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId;
  if (!userId) {
    return next(new Error("Unauthorized socket"));
  }
  socket.userId = userId;
  next();
});

io.on("connection", async (socket) => {
  const userId = socket.userId;

  socket.join(`user:${userId}`);

  // Cancel pending offline timer if reconnecting
  if (offlineTimers.has(userId)) {
    clearTimeout(offlineTimers.get(userId));
    offlineTimers.delete(userId);
  }

  // First active socket for this user
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true
      });
    } catch (err) {
      console.error("Failed to set user online:", err);
    }

    io.emit("user-online", userId);
  }

  onlineUsers.get(userId).add(socket.id);
  

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("join-blog", (blogId) => {
    socket.join(blogId);
  });

  socket.on("join-room", async (roomId) => {
  socket.join(roomId);

  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  const users = roomPresence.get(roomId);

  if (!users.has(socket.userId)) {
    users.set(socket.userId, new Set());
  }

  users.get(socket.userId).add(socket.id);

  await Message.updateMany(
    {
      roomId,
      sender: { $ne: socket.userId },
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );

  io.to(roomId).emit("messages-seen", {
    roomId,
    seenBy: socket.userId,
  });

});



socket.on("leave-room", (roomId) => {
  const users = roomPresence.get(roomId);
  if (!users) return;

  const sockets = users.get(socket.userId);
  if (!sockets) return;

  sockets.delete(socket.id);

  if (sockets.size === 0) {
    users.delete(socket.userId);
  }

  if (users.size === 0) {
    roomPresence.delete(roomId);
  }

  socket.leave(roomId);
});

// RECEIVE MESSAGE FROM SENDER
socket.on("send-message", async ({ roomId, ciphertext, nonce }) => {
  if (!roomId || !ciphertext || !nonce) return;

  const senderId = socket.userId;
  const [u1, u2] = roomId.split("_");

  const receiverId = senderId === u1 ? u2 : u1;

  // presence check
  const usersInRoom = roomPresence.get(roomId) || new Set();
  const receiverInRoom = usersInRoom.has(receiverId);

  // save encrypted message
  const message = await Message.create({
    roomId,
    sender: senderId,
    ciphertext,
    nonce,
    readAt: receiverInRoom ? new Date() : null, 
  });

  // build update safely
  const update = {
    $set: {
      roomId,
      members: [u1, u2],
      lastMessage: {
        text: "Encrypted message",
        sender: senderId,
      },
      lastMessageAt: message.createdAt,
    },
  };

  // only increment unread if receiver NOT in room
  if (!receiverInRoom) {
    update.$inc = { [`unreadCount.${receiverId}`]: 1 };
  }

  await Conversation.findOneAndUpdate(
    { roomId },
    update,
    { upsert: true, new: true }
  );

  // send message to room
  socket.to(roomId).emit("receive-message", {
    _id: message._id,
    roomId,
    sender: senderId,
    ciphertext,
    nonce,
    createdAt: message.createdAt,
    readAt: message.readAt, 
  });

  //  if receiver already in room → mark seen instantly
  if (receiverInRoom) {
    io.to(roomId).emit("messages-seen", {
      roomId,
      seenBy: receiverId,
    });
  }

  // notify clients to refresh conversation list
  io.to(`user:${u1}`).emit("conversation-updated", {
  roomId,
  lastMessage: "Encrypted message",
  lastMessageAt: message.createdAt,
  sender: senderId,
});

io.to(`user:${u2}`).emit("conversation-updated", {
  roomId,
  lastMessage: "Encrypted message",
  lastMessageAt: message.createdAt,
  sender: senderId,
});

});




socket.on("disconnect", () => {
  for (const [roomId, users] of roomPresence.entries()) {
    const sockets = users.get(socket.userId);
    if (!sockets) continue;

    sockets.delete(socket.id);

    if (sockets.size === 0) {
      users.delete(socket.userId);
    }

    if (users.size === 0) {
      roomPresence.delete(roomId);
    }
  }

  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socket.id);

  if (sockets.size > 0) return;

  const timer = setTimeout(async () => {
    try {
      const stillSockets = onlineUsers.get(userId);
      if (stillSockets && stillSockets.size > 0) return;

      onlineUsers.delete(userId);

      const lastSeen = new Date();

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      io.emit("user-offline", userId);
      io.emit("user-last-seen", { userId, lastSeen });

      offlineTimers.delete(userId);
    } catch (err) {
      console.error("Disconnect presence update failed:", err);
    }
  }, 500);

  offlineTimers.set(userId, timer);
});

});

app.set("io", io);

/* ================= DB ================= */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"));

/* ================= VIEW ENGINE ================= */
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

/* ================= GLOBAL MIDDLEWARE ================= */
app.use((req, res, next) => {
  if (req.path.match(/\.(env|php|git|sql)$/i)) {
    return res.status(404).end();
  }
  next();
});

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

/* ================= AUTH (DO NOT CHANGE LOGIC) ================= */
app.use(attachUser);

/* ================= BODY / STATIC ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve('./public')));
app.use(methodOverride('_method'));

/* ================= NAVBAR DATA ONLY ================= */
app.use((req, res, next) => {
  if (req.user) {
    res.locals.navUser = {
      id: req.user._id,
      name: req.user.fullName,
      avatar: req.user.profileImageUrl
    };
  } else {
    res.locals.navUser = null;
  }
  next();
});
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

/* ================= HOME ================= */
app.get('/', async (req, res) => {
  const allBlogs = await Blog.find({})
    .populate('createdBy', 'fullName profileImageUrl')
    .sort({ createdAt: -1 })
    .lean();

  const blogs = allBlogs.map(blog => ({
    ...blog,
    author: {
      fullName: blog.createdBy.fullName,
      profileImage: blog.createdBy.profileImageUrl
    }
  }));

  res.render('Home', {
    blogs,
    user: req.user, // kept because frontend already depends on it
  });
});

/* ================= ROUTES ================= */
app.use("/api", followApiRoutes);
app.use("/api/devices", deviceRoutes);
app.use('/user', UserRoute);
app.use('/blog', BlogRoute);
app.use("/messages", MessageRoute);

/* ================= START ================= */

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});