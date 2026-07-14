import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an announcement title'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Please add announcement body content'],
    },
    attachment: {
      type: String, // PDF link, Doc link, or Cloudinary URL
    },
    targetDepartments: {
      type: [String],
      default: ['All'], // ['CS', 'IT'] or ['All']
    },
    targetYears: {
      type: [Number],
      default: [0], // [1, 2, 3, 4] or [0] for all years
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ isPinned: -1, createdAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
