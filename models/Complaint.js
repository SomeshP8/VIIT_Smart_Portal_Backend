import mongoose from 'mongoose';

const complaintHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved'],
    required: true,
  },
  remarks: {
    type: String,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a detailed description'],
    },
    category: {
      type: String,
      enum: ['Hostel', 'Classroom', 'Transport', 'Other'],
      required: [true, 'Please select a category'],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved'],
      default: 'pending',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String, // Latest admin feedback
    },
    history: [complaintHistorySchema], // Audit timeline
  },
  {
    timestamps: true,
  }
);

// Indexes
complaintSchema.index({ student: 1, status: 1 });
complaintSchema.index({ category: 1, status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
