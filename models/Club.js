import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a club name'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a club description'],
    },
    logo: {
      type: String, // Path or Cloudinary URL
      default: 'https://api.dicebear.com/7.x/identicon/svg?seed=club',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Club President / Student Lead
    },
    members: [
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

const Club = mongoose.model('Club', clubSchema);

export default Club;
