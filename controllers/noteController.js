import Note from '../models/Note.js';
import { createNoteSchema } from '../validations/noteValidation.js';

// @desc    Upload new study notes
// @route   POST /api/v1/notes
// @access  Private
export const uploadNote = async (req, res, next) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a PDF/notes document file');
    }

    const note = await Note.create({
      ...validatedData,
      fileUrl: `/uploads/${req.file.filename}`, // Local storage path (Cloudinary configuration in Phase 8)
      uploadedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: note,
      message: 'Study notes uploaded successfully',
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

// @desc    Get notes catalog (with search & filters & pagination)
// @route   GET /api/v1/notes
// @access  Private
export const getNotes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filters
    if (req.query.department) {
      query.department = req.query.department;
    }
    if (req.query.year) {
      query.year = parseInt(req.query.year, 10);
    }
    if (req.query.semester) {
      query.semester = parseInt(req.query.semester, 10);
    }

    // Text search matching subject and title
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    const total = await Note.countDocuments(query);
    
    let findQuery = Note.find(query);
    if (req.query.q) {
      findQuery = findQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      findQuery = findQuery.sort({ createdAt: -1 });
    }

    const notes = await findQuery
      .populate('uploadedBy', 'name email avatar role')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        notes,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Study materials retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete study notes
// @route   DELETE /api/v1/notes/:id
// @access  Private
export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Study materials not found');
    }

    // Allow deleting only if user is uploader OR user is admin
    const isUploader = note.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isUploader && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to delete these study notes');
    }

    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Study notes deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
