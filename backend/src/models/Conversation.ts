import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  isGroup: boolean;
  name?: string;
  avatarUrl?: string;
  participants: Types.ObjectId[];
  admins: Types.ObjectId[];
  isVanishMode: boolean;
  mutedFor: Types.ObjectId[];
}

const ConversationSchema = new Schema<IConversation>(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String },
    avatarUrl: { type: String },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isVanishMode: { type: Boolean, default: false },
    mutedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);


