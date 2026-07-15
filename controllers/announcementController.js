import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { createAnnouncementSchema } from '../validations/announcementValidation.js';

// @desc    Create a new announcement
// @route   POST /api/v1/announcements
// @access  Private (Admin Only)
export const createAnnouncement = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Only administrators can create announcements');
    }

    // Normalize multipart array fields: multer gives a plain string when only one value
    // is submitted for a repeated key, but Zod expects an array.
    const body = {
      ...req.body,
      targetDepartments: req.body.targetDepartments
        ? [].concat(req.body.targetDepartments)
        : undefined,
      targetYears: req.body.targetYears
        ? [].concat(req.body.targetYears)
        : undefined,
    };

    const validatedData = createAnnouncementSchema.parse(body);

    let attachmentUrl = '';
    if (req.file) {
      attachmentUrl = req.file.path; // Cloudinary URL set by multer-storage-cloudinary
    }

    const announcement = await Announcement.create({
      ...validatedData,
      attachment: attachmentUrl,
      createdBy: req.user._id,
    });

    // Real-time dispatch: Notify target student audiences
    const notifyTargetStudents = async () => {
      try {
        let studentQuery = { role: 'student' };

        // Construct query matching department targets
        if (!validatedData.targetDepartments.includes('All')) {
          studentQuery.department = { $in: validatedData.targetDepartments };
        }

        // Construct query matching year targets
        if (!validatedData.targetYears.includes(0)) {
          studentQuery.year = { $in: validatedData.targetYears };
        }

        // Find matching students
        const targetStudents = await User.find(studentQuery).select('_id department year');

        // Create db notification logs
        const title = 'New Campus Announcement';
        const message = `Notice: "${announcement.title}" has been posted.`;
        
        const notifications = targetStudents.map(student => ({
          recipient: student._id,
          title,
          message,
          type: 'announcement',
          relatedId: announcement._id,
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }

        // Emit via Socket.io
        if (req.io) {
          // If broadcast is global
          if (validatedData.targetDepartments.includes('All') && validatedData.targetYears.includes(0)) {
            req.io.emit('notification', {
              title,
              message,
              type: 'announcement',
              relatedId: announcement._id,
              createdAt: new Date(),
            });
          } else {
            // Emit to specific department/year rooms
            validatedData.targetDepartments.forEach(dept => {
              const deptName = dept === 'All' ? '' : dept;
              
              validatedData.targetYears.forEach(yr => {
                if (deptName && yr !== 0) {
                  // Specific group room e.g., CS_Year2
                  req.io.to(`${deptName}_Year${yr}`).emit('notification', {
                    title,
                    message,
                    type: 'announcement',
                    relatedId: announcement._id,
                    createdAt: new Date(),
                  });
                }
              });
            });
          }
        }
      } catch (err) {
        console.error('Error dispatching announcement notifications:', err);
      }
    };

    // Run notification dispatch in background to prevent API blocking
    notifyTargetStudents();

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement posted successfully',
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

// @desc    Get announcements (with filtering and pagination)
// @route   GET /api/v1/announcements
// @access  Private
export const getAnnouncements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Students only see announcements matching their department and academic year
    if (req.user.role === 'student') {
      query.$and = [
        { targetDepartments: { $in: [req.user.department, 'All'] } },
        { targetYears: { $in: [req.user.year, 0] } }
      ];
    } else {
      // Admin filter params
      if (req.query.department) {
        query.targetDepartments = req.query.department;
      }
      if (req.query.year) {
        query.targetYears = parseInt(req.query.year, 10);
      }
    }

    const total = await Announcement.countDocuments(query);
    
    // Sort pinned announcements first, then newest
    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email avatar')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        announcements,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Announcements retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin announcement
// @route   PUT /api/v1/announcements/:id/pin
// @access  Private (Admin Only)
export const togglePinAnnouncement = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Only administrators can pin announcements');
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      res.status(404);
      throw new Error('Announcement not found');
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    res.status(200).json({
      success: true,
      data: announcement,
      message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete announcement
// @route   DELETE /api/v1/announcements/:id
// @access  Private (Admin Only)
export const deleteAnnouncement = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Only administrators can delete announcements');
    }

    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      res.status(404);
      throw new Error('Announcement not found');
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
