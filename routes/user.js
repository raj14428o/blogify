const { Router } = require('express');
const bcrypt = require('bcryptjs');
const User = require('../Models/user');
const Blog = require('../Models/blog');
const Comment = require('../Models/comments');
const sendEmail = require('../utils/sendEmail');

const router = Router();

// Signin page
router.get('/signin', (req, res) => {
  return res.render('signin');
});

// Signin logic
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error();

    const token = await User.matchPassword(email, password); // implement simple equality check
    if (!token) throw new Error();

    if (!user.isEmailVerified) {
      req.session.verifyEmail = user.email;
      return req.session.save(() => {
        res.redirect('/user/verify');
      });
    }

    return res.cookie('token', token).redirect('/');
  } catch (error) {
    console.error('Signin failed:', error);
    return res.render('signin', { error: 'Incorrect Email or Password' });
  }
});


// Profile page
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    const blogs = await Blog.find({ createdBy: userId });
    const comments = await Comment.find({ createdBy: userId }).populate('blogId', 'title');

    const formattedComments = comments.map(comment => ({
      content: comment.content,
      blogId: comment.blogId?._id || null,
      blogTitle: comment.blogId?.title || 'Deleted Blog',
    }));

    return res.render('profile', {
      user: req.user,
      profileUser: user,
      blogs,
      comments: formattedComments,
    });
  } catch (err) {
    console.error('Profile route error:', err);
    res.redirect('/');
  }
});

// Signup page
router.get('/signup', (req, res) => {
  return res.render('signup');
});

// Signup logic
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('signup', { error: 'Email already registered' });
    }

    const user = await User.create({
      fullName,
      email,
      password, 
      isEmailVerified: false,
    });

    req.session.verifyEmail = user.email;
    return res.redirect('/user/verify');
  } catch (err) {
    console.error(err);
    res.redirect('/user/signup');
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token').redirect('/');
});

// Verify GET
router.get('/verify', async (req, res) => {
  const email = req.session.verifyEmail;
  if (!email) return res.redirect('/user/signin');

  const user = await User.findOne({ email });
  if (!user) return res.redirect('/user/signup');
  if (user.isEmailVerified) return res.redirect('/');

  // Only generate OTP if none exists or expired
  if (!user.emailVerificationExpiry || Date.now() > user.emailVerificationExpiry) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);

  
    user.emailVerificationOTP = await bcrypt.hash(otp, 10);
    user.emailVerificationExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log('sending email to:', user.email);
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    console.log('📧 Email sent to:', user.email);
  }

  res.render('verify', { email });
});

// Verify POST
router.post('/verify', async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.verifyEmail;
    if (!email) return res.redirect('/user/signup');

    const user = await User.findOne({ email });
    if (!user) return res.redirect('/user/signup');

    if (Date.now() > user.emailVerificationExpiry) {
      return res.render('verify', { email, error: 'OTP expired' });
    }

    const isValid = await bcrypt.compare(otp, user.emailVerificationOTP);
    if (!isValid) {
      return res.render('verify', { email, error: 'Invalid OTP' });
    }

    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    const token = await User.matchPassword(email, password);
    res.cookie('token', token).redirect('/');

    delete req.session.verifyEmail;

    return res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/user/signup');
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const email = req.body.email || req.session.verifyEmail;
    if (!email) return res.redirect('/user/signin');

    const user = await User.findOne({ email });
    if (!user) return res.redirect('/user/signup');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationOTP = await bcrypt.hash(otp, 10);
    user.emailVerificationExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    req.session.verifyEmail = user.email;
    return res.render('verify', { email, info: 'OTP resent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.render('verify', { email: req.body.email, error: 'Failed to resend OTP. Try again later.' });
  }
});

module.exports = router;