require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const Blog = require('./Models/blog');

const UserRoute = require("./routes/user");
const BlogRoute = require("./routes/blog");
const { checkForAuthenthicationCookie } = require('./middlewares/authentication');

const app = express();
const PORT = process.env.PORT;

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"));

app.set('view engine','ejs');
app.set('views', path.resolve('./views'));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
}));

app.use(checkForAuthenthicationCookie('token'));
app.use(express.static(path.resolve('./public')));
app.use(methodOverride('_method'));

app.get('/', async (req, res) => {
  const allBlogs = await Blog.find({})
    .populate('createdBy')
    .sort({ createdAt: -1 });

  res.render('Home', {
    blogs: allBlogs,
    user: req.user,
  });
});

app.use('/user', UserRoute);
app.use('/blog', BlogRoute);

app.listen(PORT, () => console.log(`Server started at ${PORT}`));
