import express from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  getPostReplies,
  createReply,
  upvotePost,
  downvotePost,
  deletePost,
} from '../controllers/forumController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/posts')
  .post(createPost)
  .get(getPosts);

router.route('/posts/:id')
  .get(getPostById)
  .delete(deletePost);

router.route('/posts/:id/replies')
  .get(getPostReplies)
  .post(createReply);

router.route('/posts/:id/upvote')
  .put(upvotePost);

router.route('/posts/:id/downvote')
  .put(downvotePost);

export default router;
