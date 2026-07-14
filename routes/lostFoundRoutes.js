import express from 'express';
import {
  createLostItem,
  getLostItems,
  getLostItemById,
  claimItem,
  updateClaimStatus,
} from '../controllers/lostFoundController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(upload.single('image'), createLostItem)
  .get(getLostItems);

router.route('/:id')
  .get(getLostItemById);

router.route('/:id/claim')
  .post(claimItem);

router.route('/:id/claim/:claimId')
  .put(updateClaimStatus);

export default router;
