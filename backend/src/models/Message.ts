import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface IMessageReaction {
  user: Types.ObjectId;
  type: ReactionType;
}

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  attachments: {
    type: 'image' | 'video' | 'file' | 'audio' | 'gif';
    url: string;
    name?: string;
    size?: number;
  }[];
  status: 'sent' | 'delivered' | 'seen';
  seenBy: Types.ObjectId[];
  reactions: IMessageReaction[];
  replyTo?: Types.ObjectId;
  forwardedFrom?: Types.ObjectId;
  isEdited: boolean;
  isDeleted: boolean;
  deletedFor: Types.ObjectId[];
  isPinned: boolean;
  isVanish: boolean;
  expiresAt?: Date;
}

const AttachmentSchema = new Schema(
  {
    type: { type: String, enum: ['image', 'video', 'file', 'audio', 'gif'], required: true },
    url: { type: String, required: true },
    name: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const ReactionSchema = new Schema<IMessageReaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      required: true,
    },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachments: { type: [AttachmentSchema], default: [] },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [ReactionSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: 'User' },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false },
    isVanish: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);


