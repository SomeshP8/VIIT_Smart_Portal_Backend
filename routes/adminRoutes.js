import express from 'express';
import { getAdminStats } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// GET /api/v1/admin/stats
router.get('/stats', getAdminStats);

export default router;
