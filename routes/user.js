const {Router} = require('express')
const User = require('../Models/user');
const Blog = require('../Models/blog');
const Comment = require('../Models/comments');

const e = require('express');
const router = Router();

router.get('/signin',(req,res)=>
{
    return res.render("signin");
})

router.post('/signin',async (req,res)=>
{
    const {email,password} = req.body;
    try{
   const token=await User.matchPassword(email,password);
    return res.cookie("token",token).redirect('/');
    }
    catch(error)
    {
        res.render('signin', {
            error : "Incorrect Email or Password"
        })
    }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user info
    const user = await User.findById(userId);

    // Get all blogs created by the user
    const blogs = await Blog.find({ createdBy: userId });

    // Get all comments made by the user, and populate blog info
    const comments = await Comment.find({ createdBy: userId }).populate('blogId', 'title');

    // Format comments to include blog title
    const formattedComments = comments.map(comment => ({
      content: comment.content,
      blogId: comment.blogId?._id || null,
      blogTitle: comment.blogId?.title || "Deleted Blog"
    }));

    return res.render("profile", {
      user: req.user,       // Logged-in user
      profileUser: user,    // Profile being viewed
      blogs,
      comments: formattedComments
    });
  } catch (err) {
    console.error("Profile route error:", err);
    res.redirect('/');
  }
});

router.get('/signup',(req,res)=>
{
    return res.render("signup");
})

router.post('/signup',async (req,res)=>
{
    const {fullName, email, password} = req.body;
    await User.create(
        {
            fullName,
            email,
            password
        }
    );
    return res.redirect('/')
})

router.get('/logout',(req,res)=>
{
    res.clearCookie("token").redirect("/")
});

module.exports=router;