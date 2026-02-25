import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastActive: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);


