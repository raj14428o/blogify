const {Router} = require('express')
const router = Router();
const multer = require('multer');
const path = require('path');
const Blog = require('../Models/blog')
const Comment = require('../Models/comments')
const fs = require('fs');


router.get('/add-new',(req,res)=>
{
    return res.render("addBlog",{
        user:req.user,
    });

})

router.post('/comment/:blogId',async (req,res)=>
{
  const comment = await Comment.create(
    {
      content : req.body.content,
      blogId : req.params.blogId,
      createdBy : req.user._id,
    }
  )
  return res.redirect(`/blog/${req.params.blogId}`)
})

router.get('/:Id', async (req,res)=>
{
   const blog= await Blog.findById(req.params.Id).populate('createdBy'); 
   const comments = await Comment.find({blogId : req.params.Id}).populate('createdBy');
   return res.render("blog",
   {user:req.user,
    blog,
  comments}
   )
})

router.delete('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id); // ✅ Fetch blog first
    if (!blog) return res.status(404).send('Blog not found');

    // ✅ Delete cover image
    const imagePath = path.join(__dirname, '..', 'public', 'uploads', path.basename(blog.coverImageURL));
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Image deletion failed:', err);
    });

    // ✅ Delete comments and blog
    await Comment.deleteMany({ blogId: req.params.id });
    await Blog.findByIdAndDelete(req.params.id);

    res.redirect('/');
  } catch (err) {
    console.error('Deletion error:', err); // ✅ Log the actual error
    res.status(500).send('Deletion failed');
  }
});

router.get('/:id/edit', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send('Blog not found');

    // Optional: Auth check
    if (req.user._id.toString() !== blog.createdBy.toString()) {
      return res.status(403).send('Unauthorized');
    }

    res.render('edit', { blog });
  } catch (err) {
    res.status(500).send('Error loading edit page');
  }
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads`));
  },
  filename: function (req, file, cb) {
    const fileName=`${Date.now()}-${file.originalname}`;
    cb(null,fileName);
  }
})

const upload = multer({ storage: storage })

router.post('/:id/edit', upload.single('coverImage'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send('Blog not found');

    // Delete old image if new one is uploaded
    if (req.file) {
      const oldImagePath = path.join(__dirname, '..', 'public', 'uploads', path.basename(blog.coverImageURL));
      fs.unlink(oldImagePath, (err) => {
        if (err) console.error('Old image deletion failed:', err);
      });

      blog.coverImageURL = `/uploads/${req.file.filename}`;
    }

    blog.title = req.body.title;
    blog.body = req.body.body;
    await blog.save();

    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).send('Update failed');
  }
});



router.post('/',upload.single("coverImage"),async (req,res)=>
{
    const {title, body, description} = req.body;
   const blog = await Blog.create({
        body,
        description, 
        title,
        createdBy : req.user._id,
        coverImageURL : `/uploads/${req.file.filename}`
    })
    console.log(req.body);
    console.log(req.file);
    return res.redirect(`/blog/${blog._id}`);
})

module.exports=router;