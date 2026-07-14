import express from 'express';
import {
  uploadNote,
  getNotes,
  deleteNote,
} from '../controllers/noteController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(upload.single('file'), uploadNote)
  .get(getNotes);

router.route('/:id')
  .delete(deleteNote);

export default router;
