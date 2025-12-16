require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const attachUser = require('./middlewares/attachUser');
const { checkForAuthenthicationCookie } = require('./middlewares/authentication');

const Blog = require('./Models/blog');
const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");

const app = express();
const PORT = process.env.PORT;

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
app.use(checkForAuthenthicationCookie('token'));

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
app.use('/user', UserRoute);
app.use('/blog', BlogRoute);

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`Server started at ${PORT}`);
});

