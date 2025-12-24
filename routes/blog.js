const { Router } = require("express");
const router = Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

const User = require("../Models/user");
const Blog = require("../Models/blog");
const Comment = require("../Models/comments");

/* ------------------ HELPERS ------------------ */

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const requireAuth = (req, res, next) => {
  if (!req.user) return res.redirect("/login");
  next();
};

const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("File delete failed:", err);
    });
  }
};

/* ------------------ MULTER ------------------ */

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, path.resolve("./public/uploads"));
  },
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

/* ------------------ ROUTES ------------------ */

/* ADD BLOG */
router.get("/add-new", requireAuth, (req, res) => {
  res.render("addBlog", { user: req.user });
});

/* CREATE BLOG */
router.post("/", requireAuth, upload.single("coverImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("Cover image required");
    }

    const { title, body, description } = req.body;

    const blog = await Blog.create({
      title,
      body,
      description,
      createdBy: req.user._id,
      coverImageURL: `/uploads/${req.file.filename}`,
    });

    res.redirect(`/blog/${blog._id}`);
  } catch (err) {
    console.error("Create blog error:", err);
    res.status(500).render("500");
  }
});

/* ADD COMMENT */
router.post("/comment/:blogId", requireAuth, async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!isValidId(blogId)) return res.status(404).render("404");
    if (!req.body.content?.trim())
      return res.status(400).send("Empty comment");

    const comment = await Comment.create({
      content: req.body.content,
      blogId,
      createdBy: req.user._id,
    });

    const user = await User.findById(req.user._id).select("fullName");

    const io = req.app.get("io");
    io.to(blogId).emit("new-comment", {
      content: comment.content,
      userId: req.user._id,
      userName: user.fullName,
      userAvatar: req.user.profileImageUrl,
    });

    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).render("500");
  }
});

/* EDIT PAGE */
router.get("/:id/edit", requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).render("404");

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).render("404");

    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    res.render("edit", { blog });
  } catch (err) {
    console.error("Edit page error:", err);
    res.status(500).render("500");
  }
});

/* UPDATE BLOG */
router.post(
  "/:id/edit",
  requireAuth,
  upload.single("coverImage"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(404).render("404");

      const blog = await Blog.findById(req.params.id);
      if (!blog) return res.status(404).render("404");

      if (blog.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).send("Unauthorized");
      }

      if (req.file) {
        const oldImage = path.join(
          __dirname,
          "..",
          "public",
          "uploads",
          path.basename(blog.coverImageURL || "")
        );
        safeUnlink(oldImage);
        blog.coverImageURL = `/uploads/${req.file.filename}`;
      }

      blog.title = req.body.title;
      blog.body = req.body.body;
      await blog.save();

      res.redirect(`/blog/${blog._id}`);
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).render("500");
    }
  }
);

/* DELETE BLOG */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).render("404");

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).render("404");

    if (blog.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    const imagePath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      path.basename(blog.coverImageURL || "")
    );

    safeUnlink(imagePath);
    await Comment.deleteMany({ blogId: blog._id });
    await Blog.findByIdAndDelete(blog._id);

    res.redirect("/");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).render("500");
  }
});

/* VIEW BLOG — ALWAYS LAST */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.includes(".")) return res.status(404).end();
    if (!isValidId(id)) return res.status(404).render("404");

    const blog = await Blog.findById(id)
      .populate("createdBy")
      .lean();

    if (!blog) return res.status(404).render("404");

    const comments = await Comment.find({ blogId: id })
      .populate("createdBy")
      .sort({ createdAt: -1 })
      .lean();

    res.render("blog", {
      user: req.user || null,
      blog,
      comments,
    });
  } catch (err) {
    console.error("Blog route error:", err);
    res.status(500).render("500");
  }
});


module.exports = router;
