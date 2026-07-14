import express from 'express';
import {
  createClub,
  getClubs,
  getClubById,
  joinClub,
  createEvent,
  getEvents,
  getEventById,
  registerForEvent,
  getStudentRegistrations,
} from '../controllers/eventController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

// Club routes
router.route('/clubs')
  .post(authorize('admin'), createClub)
  .get(getClubs);

router.route('/clubs/:id')
  .get(getClubById);

router.route('/clubs/:id/join')
  .post(joinClub);

// Event routes
router.route('/')
  .post(upload.single('image'), createEvent)
  .get(getEvents);

router.route('/my-registrations')
  .get(getStudentRegistrations);

router.route('/:id')
  .get(getEventById);

router.route('/:id/register')
  .post(registerForEvent);

export default router;
