import mongoose from 'mongoose';

const claimSchema = new mongoose.Schema({
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: [true, 'Please provide a message explaining why this item belongs to you'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const lostItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    image: {
      type: String, // Will store path to local file or Cloudinary URL
    },
    location: {
      type: String,
      required: [true, 'Please specify where the item was lost or found'],
    },
    date: {
      type: Date,
      required: [true, 'Please specify the date of the incident'],
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: [true, 'Please select type: lost or found'],
    },
    status: {
      type: String,
      enum: ['open', 'claimed'],
      default: 'open',
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claims: [claimSchema],
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for filtration and search
lostItemSchema.index({ type: 1, status: 1 });
lostItemSchema.index({ title: 'text', description: 'text' });

const LostItem = mongoose.model('LostItem', lostItemSchema);

export default LostItem;
