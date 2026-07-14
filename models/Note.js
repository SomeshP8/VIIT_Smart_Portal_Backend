import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a notes title'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Please specify the subject'],
      trim: true,
    },
    department: {
      type: String,
      enum: ['CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'Other'],
      required: [true, 'Please specify the department'],
    },
    year: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: [true, 'Please specify the academic year'],
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      required: [true, 'Please specify the semester (1-8)'],
    },
    fileUrl: {
      type: String,
      required: [true, 'Please upload a PDF/notes document file'],
    },
    uploadedBy: {
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
noteSchema.index({ department: 1, year: 1, semester: 1 });
noteSchema.index({ subject: 'text', title: 'text' });

const Note = mongoose.model('Note', noteSchema);

export default Note;
