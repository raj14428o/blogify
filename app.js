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

const attachUser = require('./middlewares/attachUser');

const Blog = require('./Models/blog');
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
const followApiRoutes = require("./routes/follow");
const MessageRoute = require("./routes/message");

const app = express();
const PORT = process.env.PORT;
const server = http.createServer(app);

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
  console.log("User online:", userId);

  socket.on("get-online-users", () => {
    socket.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("join-blog", (blogId) => {
    socket.join(blogId);
  });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return;

    sockets.delete(socket.id);

    // Still has other tabs open
    if (sockets.size > 0) return;

    const timer = setTimeout(async () => {
      try {
        const stillSockets = onlineUsers.get(userId);
        if (stillSockets && stillSockets.size > 0) return;

        onlineUsers.delete(userId);

        const lastSeen = new Date();

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen
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
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

/* ================= AUTH (DO NOT CHANGE LOGIC) ================= */
app.use(attachUser);

/* ================= BODY / STATIC ================= */
app.use(express.urlencoded({ extended: false }));
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
app.use('/user', UserRoute);
app.use('/blog', BlogRoute);
app.use("/messages", MessageRoute);

/* ================= START ================= */

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});