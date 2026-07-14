import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    department: {
      type: String,
      enum: ['CS', 'IT', 'EC', 'EE', 'ME', 'CE', 'Other'],
      required: function() {
        return this.role === 'student';
      },
    },
    year: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: function() {
        return this.role === 'student';
      },
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      required: function() {
        return this.role === 'student';
      },
    },
    rollNumber: {
      type: String,
      trim: true,
      required: function() {
        return this.role === 'student';
      },
    },
    avatar: {
      type: String,
      default: function() {
        return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(this.name)}`;
      },
    },
    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
