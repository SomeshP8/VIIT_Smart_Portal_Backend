import Post from '../models/Post.js';
import Reply from '../models/Reply.js';
import Notification from '../models/Notification.js';
import { createPostSchema, createReplySchema } from '../validations/forumValidation.js';

// @desc    Create a forum post
// @route   POST /api/v1/forum/posts
// @access  Private
export const createPost = async (req, res, next) => {
  try {
    const validatedData = createPostSchema.parse(req.body);

    const post = await Post.create({
      ...validatedData,
      author: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: post,
      message: 'Forum thread created successfully',
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      res.status(400);
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      next(new Error(`Validation error: ${errors}`));
    } else {
      next(error);
    }
  }
};

// @desc    Get all posts (with pagination, tag filter, and search)
// @route   GET /api/v1/forum/posts
// @access  Private
export const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest'; // newest | upvoted

    let query = {};

    // Filter by tag
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    // Text search query
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    const total = await Post.countDocuments(query);
    
    let findQuery = Post.find(query).populate('author', 'name email avatar role');
    
    if (req.query.q) {
      findQuery = findQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else if (sort === 'upvoted') {
      // Sort by length of upvotes array descending
      findQuery = findQuery.sort({ upvotes: -1, createdAt: -1 });
    } else {
      findQuery = findQuery.sort({ createdAt: -1 });
    }

    const posts = await findQuery.skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Forum posts retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post details
// @route   GET /api/v1/forum/posts/:id
// @access  Private
export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email avatar role department');
    if (!post) {
      res.status(404);
      throw new Error('Forum thread not found');
    }

    res.status(200).json({
      success: true,
      data: post,
      message: 'Forum thread retrieved',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments/replies of a post
// @route   GET /api/v1/forum/posts/:id/replies
// @access  Private
export const getPostReplies = async (req, res, next) => {
  try {
    const replies = await Reply.find({ post: req.params.id })
      .populate('author', 'name email avatar role department')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: replies,
      message: 'Replies retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post a reply to a thread
// @route   POST /api/v1/forum/posts/:id/replies
// @access  Private
export const createReply = async (req, res, next) => {
  try {
    const validatedData = createReplySchema.parse(req.body);

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error('Forum thread not found');
    }

    const reply = await Reply.create({
      post: post._id,
      author: req.user._id,
      content: validatedData.content,
      parentId: validatedData.parentId || null,
    });

    // Increment reply count on post
    post.replyCount += 1;
    await post.save();

    // Populate author details to send back to client
    const populatedReply = await reply.populate('author', 'name email avatar role department');

    // Notify post author (if replier is not the author)
    if (post.author.toString() !== req.user._id.toString()) {
      const title = 'New Forum Reply';
      const message = `${req.user.name} commented on your post: "${post.title.substring(0, 25)}..."`;
      
      await Notification.create({
        recipient: post.author,
        title,
        message,
        type: 'forum',
        relatedId: post._id,
      });

      if (req.io) {
        req.io.to(post.author.toString()).emit('notification', {
          title,
          message,
          type: 'forum',
          relatedId: post._id,
          createdAt: new Date(),
        });
      }
    }

    res.status(201).json({
      success: true,
      data: populatedReply,
      message: 'Reply posted successfully',
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      res.status(400);
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      next(new Error(`Validation error: ${errors}`));
    } else {
      next(error);
    }
  }
};

// @desc    Upvote a post
// @route   PUT /api/v1/forum/posts/:id/upvote
// @access  Private
export const upvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error('Thread not found');
    }

    const userId = req.user._id;

    // Check if already upvoted
    const upvotedIdx = post.upvotes.indexOf(userId);
    if (upvotedIdx > -1) {
      // Toggle off upvote
      post.upvotes.splice(upvotedIdx, 1);
    } else {
      // Add upvote
      post.upvotes.push(userId);
      // Remove downvote if exists
      const downvotedIdx = post.downvotes.indexOf(userId);
      if (downvotedIdx > -1) {
        post.downvotes.splice(downvotedIdx, 1);
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: {
        upvotes: post.upvotes,
        downvotes: post.downvotes,
      },
      message: 'Vote updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Downvote a post
// @route   PUT /api/v1/forum/posts/:id/downvote
// @access  Private
export const downvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error('Thread not found');
    }

    const userId = req.user._id;

    const downvotedIdx = post.downvotes.indexOf(userId);
    if (downvotedIdx > -1) {
      // Toggle off
      post.downvotes.splice(downvotedIdx, 1);
    } else {
      // Add downvote
      post.downvotes.push(userId);
      // Remove upvote if exists
      const upvotedIdx = post.upvotes.indexOf(userId);
      if (upvotedIdx > -1) {
        post.upvotes.splice(upvotedIdx, 1);
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: {
        upvotes: post.upvotes,
        downvotes: post.downvotes,
      },
      message: 'Vote updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a post
// @route   DELETE /api/v1/forum/posts/:id
// @access  Private
export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error('Thread not found');
    }

    // Only author or admin can delete post
    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to delete this thread');
    }

    await Post.findByIdAndDelete(req.params.id);
    // Delete replies for this post
    await Reply.deleteMany({ post: req.params.id });

    res.status(200).json({
      success: true,
      data: null,
      message: 'Forum thread deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
