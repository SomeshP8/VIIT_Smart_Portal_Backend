import Complaint from '../models/Complaint.js';
import { createComplaintSchema, updateComplaintStatusSchema } from '../validations/complaintValidation.js';
import Notification from '../models/Notification.js';

// @desc    Create a new complaint
// @route   POST /api/v1/complaints
// @access  Private (Student)
export const createComplaint = async (req, res, next) => {
  try {
    // Only student role can create complaint
    if (req.user.role !== 'student') {
      res.status(403);
      throw new Error('Only students can file complaints');
    }

    const validatedData = createComplaintSchema.parse(req.body);

    const complaint = await Complaint.create({
      ...validatedData,
      student: req.user._id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: complaint,
      message: 'Complaint submitted successfully',
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

// @desc    Get all complaints (admin) or user's own complaints (student)
// @route   GET /api/v1/complaints
// @access  Private
export const getComplaints = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // If student, filter by their own complaints
    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else {
      // Admin filter options
      if (req.query.category) {
        query.category = req.query.category;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
    }

    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('student', 'name email rollNumber department year')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Complaints retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint details
// @route   GET /api/v1/complaints/:id
// @access  Private
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email rollNumber department year')
      .populate('history.updatedBy', 'name role');

    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    // Students can only view their own complaint
    if (req.user.role === 'student' && complaint.student._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to view this complaint');
    }

    res.status(200).json({
      success: true,
      data: complaint,
      message: 'Complaint retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status and add remarks
// @route   PUT /api/v1/complaints/:id/status
// @access  Private (Admin Only)
export const updateComplaintStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Only admins can update complaint status');
    }

    const validatedData = updateComplaintStatusSchema.parse(req.body);

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      res.status(404);
      throw new Error('Complaint not found');
    }

    const oldStatus = complaint.status;
    const newStatus = validatedData.status;

    // Apply changes
    complaint.status = newStatus;
    complaint.remarks = validatedData.remarks;

    // Append to audit history
    complaint.history.push({
      status: newStatus,
      remarks: validatedData.remarks,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await complaint.save();

    // Create a database notification for the student
    const notificationTitle = 'Complaint Status Update';
    const notificationMessage = `Your complaint "${complaint.title}" has been marked as ${newStatus.replace('_', ' ')}. Remarks: ${validatedData.remarks}`;
    
    await Notification.create({
      recipient: complaint.student,
      title: notificationTitle,
      message: notificationMessage,
      type: 'complaint',
      relatedId: complaint._id,
    });

    // Real-time socket notification dispatch
    if (req.io) {
      req.io.to(complaint.student.toString()).emit('notification', {
        title: notificationTitle,
        message: notificationMessage,
        type: 'complaint',
        relatedId: complaint._id,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: complaint,
      message: 'Complaint status updated successfully',
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
