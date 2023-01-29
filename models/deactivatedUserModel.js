import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// DEACTIVATED USER SCHEMA
const deactivatedUserSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.ObjectId,
      required: [true, '_id is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    isMailVerified: {
      type: Boolean,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'guide', 'lead-guide', 'admin'],
        message: 'Invalid role',
      },
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: 8,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
    photo: String,
    toBeRemovedAt: {
      type: Date,
      default: () => Date.now() + 30 * 24 * 60 * 60 * 1000,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// INSTANCE METHODS
deactivatedUserSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// MODEL
export const DeactivatedUser = mongoose.model(
  'DeactivatedUser',
  deactivatedUserSchema
);
