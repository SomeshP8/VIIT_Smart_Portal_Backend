import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getNotifications);

router.route('/mark-all')
  .put(markAllAsRead);

router.route('/:id/read')
  .put(markAsRead);

export default router;
