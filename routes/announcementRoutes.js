import express from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  togglePinAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(authorize('admin'), upload.single('attachment'), createAnnouncement)
  .get(getAnnouncements);

router.route('/:id/pin')
  .put(authorize('admin'), togglePinAnnouncement);

router.route('/:id')
  .delete(authorize('admin'), deleteAnnouncement);

export default router;
