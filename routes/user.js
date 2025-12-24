const { Router } = require('express');
const bcrypt = require('bcryptjs');
const User = require('../Models/user');
const Blog = require('../Models/blog');
const Comment = require('../Models/comments');
const multer = require("multer");
const path = require("path");

const sendEmail = require('../utils/sendEmail');
const { isLoggedIn} = require("../middlewares/auth")
const router = Router();

// Multer setup for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/profile"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}${ext}`); // overwrite same user's image
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});
const uploadProfileImage = upload;


// Signin logic
router.get('/signin', (req, res) => {
  res.render('signin', { error: null }); 
});

// Signin logic
router.post('/signin', async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not registered');
    }

    const token = await User.matchPassword(email, password);

    if (!user.isEmailVerified) {
      req.session.verifyEmail = user.email;
      req.session.verifyPurpose = 'signup';
      return req.session.save(() => {
        res.redirect('/user/verify');
      });
    }

    return res.cookie('token', token).redirect('/');
  } catch (error) {
    console.error('Signin failed:', error.message);

    return res.render('signin', {
      error: error.message
    });
  }
});

//Edit profile page
router.get("/profile/edit", isLoggedIn, (req, res) => {
  res.render("profile_edit", { user: req.user });
});

const { createTokenForUser } = require("../services/authentication");

router.post(
  "/profile/edit/image",
  isLoggedIn,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.redirect("/user/profile/edit");
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profileImageUrl: `/profile/${req.file.filename}` },
        { new: true }
      );

      //  RE-ISSUE JWT with updated data
      const token = createTokenForUser(user.toObject());
      res.cookie("token", token);

      const io = req.app.get("io");

io.emit("user-updated", {
  userId: user._id.toString(),
  fullName: user.fullName,
  profileImageUrl: user.profileImageUrl
});

      res.redirect(`/user/profile/${user._id}`);
    } catch (err) {
      console.error("Edit profile image error:", err);
      res.redirect("/user/profile/edit");
    }
  }
);

router.post(
  "/profile/edit/name",
  isLoggedIn,
  async (req, res) => {
    try {
      const { fullName } = req.body;

      if (!fullName || !fullName.trim()) {
        return res.redirect("/user/profile/edit");
      }

      const user = await User.findById(req.user._id);
      user.fullName = fullName.trim();

      await user.save();

   
      const token = createTokenForUser(user.toObject());
      res.cookie("token", token);
       
      const io = req.app.get("io");

io.emit("user-updated", {
  userId: user._id.toString(),
  fullName: user.fullName,
  profileImageUrl: user.profileImageUrl
});
      res.redirect(`/user/profile/${user._id}`);
    } catch (err) {
      console.error("Edit name error:", err);
      res.redirect("/user/profile/edit");
    }
  }
);

router.post(
  "/profile/edit/email",
  isLoggedIn,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !email.trim()) {
        return res.redirect("/user/profile/edit");
      }

      const newEmail = email.trim().toLowerCase();

      const user = await User.findById(req.user._id);

      // no change → do nothing
      if (newEmail === user.email) {
        return res.redirect("/user/profile/edit");
      }

      //  CHECK if email already exists
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) {
        // same user? (rare but safe)
        if (existingUser._id.toString() !== user._id.toString()) {
          return res.render("profile_edit", {
            user,
            error: "Email already in use by another account",
          });
        }
      }

      // update email
      user.email = newEmail;
      user.isEmailVerified = false;

      await user.save();

      res.clearCookie("token");

      // trigger verification flow
      req.session.verifyEmail = user.email;
      req.session.verifyPurpose = "signup";

      return res.redirect("/user/verify");
    } catch (err) {
      console.error("Edit email error:", err);
      res.redirect("/user/profile/edit");
    }
  }
);


// Profile page
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.redirect('/');

    const blogs = await Blog.find({ createdBy: userId });
    const comments = await Comment
      .find({ createdBy: userId })
      .populate('blogId', 'title');

    const formattedComments = comments.map(comment => ({
      content: comment.content,
      blogId: comment.blogId?._id || null,
      blogTitle: comment.blogId?.title || 'Deleted Blog',
    }));

    let isFollowing = false;
    if (req.user) {
      isFollowing = user.followers.some(
        id => id.toString() === req.user._id.toString()
      );
    }

    return res.render('profile', {
      user: req.user,
      profileUser: user,
      blogs,
      comments: formattedComments,
      isFollowing, 
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
    req.session.verifyPurpose = 'signup';
    return res.redirect('/user/verify');
  } catch (err) {
    console.error(err);
    res.redirect('/user/signup');
  }
});

// Logout
router.get('/logout', async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      activeSessionId: null,
    });
  }

  req.session.destroy(() => {
    res.clearCookie("token");
    res.redirect("/user/signin");
  });
});


// Verify GET
router.get('/verify', async (req, res) => {
  const email = req.session.verifyEmail;
  const purpose = req.session.verifyPurpose;

  if (!email || !purpose) return res.redirect('/user/signin');

  const user = await User.findOne({ email });
  if (!user) return res.redirect('/user/signup');

  // Only block if purpose is signup
  if (purpose === 'signup' && user.isEmailVerified) {
    return res.redirect('/');
  }

  // Generate OTP only if expired or not exists
  if (!user.emailVerificationExpiry || Date.now() > user.emailVerificationExpiry) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.emailVerificationOTP = await bcrypt.hash(otp, 10);
    user.emailVerificationExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      to: user.email,
      subject:
        purpose === 'signup'
          ? 'Verify your email'
          : 'Reset password OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });
  }

  res.render('verify', { email });
});


// Verify POST
router.post('/verify', async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.verifyEmail;
    const purpose = req.session.verifyPurpose;

    if (!email || !purpose) {
      return res.redirect('/user/signin');
    }

    const user = await User.findOne({ email });
    if (!user) return res.redirect('/user/signup');

    if (!user.emailVerificationExpiry || Date.now() > user.emailVerificationExpiry) {
      return res.render('verify', {
        email,
        error: 'OTP expired',
      });
    }

    const isValid = await bcrypt.compare(otp, user.emailVerificationOTP);
    if (!isValid) {
      return res.render('verify', {
        email,
        error: 'Invalid OTP',
      });
    }

    // clear OTP
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpiry = undefined;

    //  FLOW CONTROL
    if (purpose === 'signup') {
      user.isEmailVerified = true;
      await user.save();

      req.session.verifyEmail = null;
      req.session.verifyPurpose = null;

      return res.redirect('/user/signin');
    }

    if (purpose === 'forgot-password') {
      await user.save();

      req.session.resetUserId = user._id;
      req.session.verifyEmail = null;
      req.session.verifyPurpose = null;

      return res.redirect('/user/reset-password');
    }

  } catch (err) {
    console.error('Verify POST error:', err);
    res.redirect('/user/signin');
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
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('forgot-password', {
        error: 'Email not registered',
      });
    }

    // mark intent
    req.session.verifyEmail = email;
    req.session.verifyPurpose = 'forgot-password';

    return res.redirect('/user/verify');
  } catch (err) {
    console.error('Forgot password error:', err);
    res.render('forgot-password', {
      error: 'Something went wrong. Try again.',
    });
  }
});

router.get('/reset-password', (req, res) => {
  if (!req.session.resetUserId) {
    return res.redirect('/user/signin');
  }

  res.render('reset-password');
});
router.post('/reset-password', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!req.session.resetUserId) {
      return res.redirect('/user/signin');
    }

    if (password !== confirmPassword) {
      return res.render('reset-password', {
        error: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.render('reset-password', {
        error: 'Password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.redirect('/user/signin');
    }

    user.password = password;
    await user.save(); // pre("save") will hash it

    req.session.resetUserId = null;

    return res.redirect('/user/signin');

  } catch (err) {
    console.error('Reset password error:', err);
    return res.render('reset-password', {
      error: 'Something went wrong. Try again.',
    });
  }
});





module.exports = router;