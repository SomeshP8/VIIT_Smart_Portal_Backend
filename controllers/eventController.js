import Event from '../models/Event.js';
import Club from '../models/Club.js';
import EventRegistration from '../models/EventRegistration.js';
import Notification from '../models/Notification.js';
import { createClubSchema, createEventSchema } from '../validations/eventValidation.js';

// @desc    Create a new student club
// @route   POST /api/v1/events/clubs
// @access  Private (Admin Only)
export const createClub = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Only administrators can register clubs');
    }

    const validatedData = createClubSchema.parse(req.body);

    const club = await Club.create({
      ...validatedData,
      owner: req.user._id, // Set the creator admin/lead as initial owner
      members: [req.user._id],
    });

    res.status(201).json({
      success: true,
      data: club,
      message: 'Club registered successfully',
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

// @desc    Get all clubs list
// @route   GET /api/v1/events/clubs
// @access  Private
export const getClubs = async (req, res, next) => {
  try {
    const clubs = await Club.find().populate('owner', 'name email avatar');
    res.status(200).json({
      success: true,
      data: clubs,
      message: 'Clubs retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single club details with events hosted
// @route   GET /api/v1/events/clubs/:id
// @access  Private
export const getClubById = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar department');

    if (!club) {
      res.status(404);
      throw new Error('Club profile not found');
    }

    // Find events hosted by this club
    const events = await Event.find({ club: club._id }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      data: {
        club,
        events,
      },
      message: 'Club details retrieved',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a club
// @route   POST /api/v1/events/clubs/:id/join
// @access  Private
export const joinClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      res.status(404);
      throw new Error('Club not found');
    }

    // Check if already member
    const alreadyMember = club.members.includes(req.user._id);
    if (alreadyMember) {
      res.status(400);
      throw new Error('You are already a member of this club');
    }

    club.members.push(req.user._id);
    await club.save();

    res.status(200).json({
      success: true,
      data: club,
      message: `Successfully joined ${club.name} club`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule an event (Club owner or Admin)
// @route   POST /api/v1/events
// @access  Private
export const createEvent = async (req, res, next) => {
  try {
    const validatedData = createEventSchema.parse(req.body);

    // Verify club exists and check permissions
    const club = await Club.findById(validatedData.clubId);
    if (!club) {
      res.status(404);
      throw new Error('Host club not found');
    }

    const isClubOwner = club.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isClubOwner && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to schedule events for this club');
    }

    let bannerUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800';
    if (req.file) {
      bannerUrl = req.file.path; // Cloudinary URL set by multer-storage-cloudinary
    }

    const event = await Event.create({
      title: validatedData.title,
      description: validatedData.description,
      date: new Date(validatedData.date),
      venue: validatedData.venue,
      capacity: validatedData.capacity,
      club: validatedData.clubId,
      bannerImage: bannerUrl,
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Campus event scheduled successfully',
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

// @desc    Get all active scheduled events (paginated)
// @route   GET /api/v1/events
// @access  Private
export const getEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Event.countDocuments({ date: { $gte: new Date() } }); // active future events
    const events = await Event.find({ date: { $gte: new Date() } })
      .populate('club', 'name logo')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Active events list retrieved',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single event detail with registration flags
// @route   GET /api/v1/events/:id
// @access  Private
export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('club', 'name logo description owner');
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Check if current user is registered
    const registration = await EventRegistration.findOne({
      event: event._id,
      student: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: {
        event,
        isRegistered: !!registration,
      },
      message: 'Event details retrieved',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register (RSVP) for an event under capacity constraints
// @route   POST /api/v1/events/:id/register
// @access  Private (Student)
export const registerForEvent = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      res.status(403);
      throw new Error('Only students can RSVP/register for campus events');
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    if (new Date(event.date) < new Date()) {
      res.status(400);
      throw new Error('Cannot register for a past event');
    }

    // Check capacity limit
    if (event.registrationsCount >= event.capacity) {
      res.status(400);
      throw new Error('Event capacity is full. Registration closed.');
    }

    // Check if already registered
    const alreadyRegistered = await EventRegistration.findOne({
      event: event._id,
      student: req.user._id,
    });
    if (alreadyRegistered) {
      res.status(400);
      throw new Error('You have already registered for this event');
    }

    // Create registration
    await EventRegistration.create({
      event: event._id,
      student: req.user._id,
    });

    // Increment count on event
    event.registrationsCount += 1;
    await event.save();

    res.status(201).json({
      success: true,
      data: event,
      message: 'RSVP confirmed. You have successfully registered for the event.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's registered events
// @route   GET /api/v1/events/my-registrations
// @access  Private (Student Only)
export const getStudentRegistrations = async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find({ student: req.user._id })
      .populate({
        path: 'event',
        populate: { path: 'club', select: 'name logo' },
      })
      .sort({ createdAt: -1 });

    const events = registrations.map(reg => reg.event).filter(Boolean);

    res.status(200).json({
      success: true,
      data: events,
      message: 'My registered events list retrieved',
    });
  } catch (error) {
    next(error);
  }
};
