
const router = require('express').Router();
const Blog = require('../models/Blog');
const jwt = require('jsonwebtoken');

// ================================
// Authentication Middleware
// ================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Access denied. No token provided'
    });
  }

  try {
    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.id;
    next();

  } catch (err) {
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

// ================================
// Create Blog
// POST /api/blogs
// ================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, category, content, image } = req.body;

    if (!title || !category || !content) {
      return res.status(400).json({
        message: 'Title, category and content are required'
      });
    }

    const blog = await Blog.create({
      title,
      category,
      content,
      image: image || '',
      author: req.userId
    });

    res.status(201).json({
      message: 'Blog created successfully',
      blog
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ================================
// Get All Blogs
// GET /api/blogs
// ================================
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Blogs fetched successfully',
      count: blogs.length,
      blogs
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ================================
// Get Single Blog
// GET /api/blogs/:id
// ================================
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      message: 'Blog fetched successfully',
      blog
    });

  } catch (err) {
    res.status(
      err.name === 'CastError' ? 400 : 500
    ).json({
      message: err.name === 'CastError'
        ? 'Invalid Blog ID'
        : err.message
    });
  }
});

// ================================
// Update Blog
// PUT /api/blogs/:id
// ================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        message: 'Blog not found'
      });
    }

    if (blog.author.toString() !== req.userId) {
      return res.status(403).json({
        message: 'You are not authorized to update this blog'
      });
    }

    const { title, category, content, image } = req.body;

    if (title !== undefined) blog.title = title;
    if (category !== undefined) blog.category = category;
    if (content !== undefined) blog.content = content;
    if (image !== undefined) blog.image = image;

    await blog.save();

    res.status(200).json({
      message: 'Blog updated successfully',
      blog
    });

  } catch (err) {
    res.status(
      err.name === 'CastError' ? 400 : 500
    ).json({
      message: err.name === 'CastError'
        ? 'Invalid Blog ID'
        : err.message
    });
  }
});

// ================================
// Delete Blog
// DELETE /api/blogs/:id
// ================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        message: 'Blog not found'
      });
    }

    if (blog.author.toString() !== req.userId) {
      return res.status(403).json({
        message: 'You are not authorized to delete this blog'
      });
    }

    await blog.deleteOne();

    res.status(200).json({
      message: 'Blog deleted successfully'
    });

  } catch (err) {
    res.status(
      err.name === 'CastError' ? 400 : 500
    ).json({
      message: err.name === 'CastError'
        ? 'Invalid Blog ID'
        : err.message
    });
  }
});

module.exports = router;
