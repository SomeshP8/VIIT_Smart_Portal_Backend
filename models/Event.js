import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add an event title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add an event description'],
    },
    date: {
      type: Date,
      required: [true, 'Please specify the event date and time'],
    },
    venue: {
      type: String,
      required: [true, 'Please specify the event venue'],
    },
    bannerImage: {
      type: String, // Cloudinary URL
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Please specify the maximum attendance capacity'],
      min: [1, 'Capacity must be at least 1 person'],
    },
    registrationsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
eventSchema.index({ date: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
