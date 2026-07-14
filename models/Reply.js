import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Please add a reply message'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reply', // References itself for nesting
      default: null,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
replySchema.index({ post: 1, parentId: 1 });

const Reply = mongoose.model('Reply', replySchema);

export default Reply;
