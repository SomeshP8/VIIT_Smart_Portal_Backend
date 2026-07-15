import LostItem from '../models/LostItem.js';
import Notification from '../models/Notification.js';
import { createLostItemSchema, claimItemSchema, updateClaimStatusSchema } from '../validations/lostFoundValidation.js';

// @desc    Post a lost or found item
// @route   POST /api/v1/lost-found
// @access  Private
export const createLostItem = async (req, res, next) => {
  try {
    const validatedData = createLostItemSchema.parse(req.body);
    
    let imageUrl = '';
    if (req.file) {
      // Local file path (Cloudinary configuration will wrap this in Phase 8)
      imageUrl = req.file.path; // Cloudinary URL set by multer-storage-cloudinary
    }

    const lostItem = await LostItem.create({
      ...validatedData,
      image: imageUrl,
      reporter: req.user._id,
      status: 'open',
    });

    res.status(201).json({
      success: true,
      data: lostItem,
      message: `${validatedData.type === 'lost' ? 'Lost' : 'Found'} item posted successfully`,
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

// @desc    Get all lost and found items (with filtering & text search & pagination)
// @route   GET /api/v1/lost-found
// @access  Private
export const getLostItems = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filters
    if (req.query.type) {
      query.type = req.query.type;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Text search query
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    const total = await LostItem.countDocuments(query);
    
    // If text query, sort by text score relevance
    let findQuery = LostItem.find(query);
    if (req.query.q) {
      findQuery = findQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      findQuery = findQuery.sort({ createdAt: -1 });
    }

    const items = await findQuery
      .populate('reporter', 'name email department rollNumber')
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Items retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a single item
// @route   GET /api/v1/lost-found/:id
// @access  Private
export const getLostItemById = async (req, res, next) => {
  try {
    const item = await LostItem.findById(req.params.id)
      .populate('reporter', 'name email department rollNumber')
      .populate('claims.claimant', 'name email department rollNumber')
      .populate('claimedBy', 'name email department');

    if (!item) {
      res.status(404);
      throw new Error('Lost & Found item not found');
    }

    res.status(200).json({
      success: true,
      data: item,
      message: 'Item details retrieved',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a claim for an item
// @route   POST /api/v1/lost-found/:id/claim
// @access  Private
export const claimItem = async (req, res, next) => {
  try {
    const validatedData = claimItemSchema.parse(req.body);

    const item = await LostItem.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }

    if (item.status === 'claimed') {
      res.status(400);
      throw new Error('This item has already been marked as claimed');
    }

    // Reporter cannot claim their own item
    if (item.reporter.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot file a claim on your own post');
    }

    // Check if user already claimed this item
    const alreadyClaimed = item.claims.some(
      (claim) => claim.claimant.toString() === req.user._id.toString()
    );
    if (alreadyClaimed) {
      res.status(400);
      throw new Error('You have already submitted a claim request for this item');
    }

    // Add claim sub-document
    item.claims.push({
      claimant: req.user._id,
      message: validatedData.message,
      status: 'pending',
    });

    await item.save();

    // Notify the item reporter
    const notificationTitle = 'New Claim Request';
    const notificationMessage = `Someone filed a claim on your posted item "${item.title}". Message: "${validatedData.message.substring(0, 30)}..."`;
    
    await Notification.create({
      recipient: item.reporter,
      title: notificationTitle,
      message: notificationMessage,
      type: 'complaint', // We reuse notifications channels
      relatedId: item._id,
    });

    if (req.io) {
      req.io.to(item.reporter.toString()).emit('notification', {
        title: notificationTitle,
        message: notificationMessage,
        type: 'complaint',
        relatedId: item._id,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: item,
      message: 'Claim request submitted successfully',
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

// @desc    Approve/Reject a claim request
// @route   PUT /api/v1/lost-found/:id/claim/:claimId
// @access  Private
export const updateClaimStatus = async (req, res, next) => {
  try {
    const validatedData = updateClaimStatusSchema.parse(req.body);

    const item = await LostItem.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }

    // Only the item reporter OR an admin can approve/reject claims
    const isReporter = item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isReporter && !isAdmin) {
      res.status(403);
      throw new Error('Not authorized to manage claims for this item');
    }

    // Find specific claim
    const claim = item.claims.id(req.params.claimId);
    if (!claim) {
      res.status(404);
      throw new Error('Claim request not found');
    }

    if (claim.status !== 'pending') {
      res.status(400);
      throw new Error('This claim has already been processed');
    }

    // Update claim status
    claim.status = validatedData.status;

    if (validatedData.status === 'approved') {
      // Mark item as claimed
      item.status = 'claimed';
      item.claimedBy = claim.claimant;

      // Reject all other pending claims automatically
      item.claims.forEach((c) => {
        if (c._id.toString() !== claim._id.toString() && c.status === 'pending') {
          c.status = 'rejected';
        }
      });
    }

    await item.save();

    // Notify the claimant about approval/rejection
    const notificationTitle = `Claim ${validatedData.status === 'approved' ? 'Approved' : 'Rejected'}`;
    const notificationMessage = `Your claim request for "${item.title}" has been ${validatedData.status}.`;
    
    await Notification.create({
      recipient: claim.claimant,
      title: notificationTitle,
      message: notificationMessage,
      type: 'complaint',
      relatedId: item._id,
    });

    if (req.io) {
      req.io.to(claim.claimant.toString()).emit('notification', {
        title: notificationTitle,
        message: notificationMessage,
        type: 'complaint',
        relatedId: item._id,
        createdAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: item,
      message: `Claim request ${validatedData.status} successfully`,
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
