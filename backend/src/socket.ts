import { Server as SocketIOServer, Socket } from 'socket.io';
import { Message } from './models/Message';
import { Conversation } from './models/Conversation';

interface ClientToServerEvents {
  'message:send': (payload: { conversationId: string; text: string }) => void;
  'message:typing': (payload: { conversationId: string; isTyping: boolean }) => void;
  'message:seen': (payload: { conversationId: string; messageId: string }) => void;
  'message:reaction': (payload: { messageId: string; type: string | null }) => void;
  'call:offer': (payload: any) => void;
  'call:answer': (payload: any) => void;
  'call:ice-candidate': (payload: any) => void;
  'call:end': (payload: any) => void;
}

interface ServerToClientEvents {
  'message:new': (payload: any) => void;
  'message:updated': (payload: any) => void;
  'message:typing': (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'conversation:updated': (payload: any) => void;
  'call:offer': (payload: any) => void;
  'call:answer': (payload: any) => void;
  'call:ice-candidate': (payload: any) => void;
  'call:end': (payload: any) => void;
}

export function registerSocketHandlers(io: SocketIOServer, socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  const userId = (socket as any).userId as string;

  // Join all rooms for user (we rely on client to tell us which conversation)
  socket.on('message:send', async ({ conversationId, text }) => {
    try {
      const msg = await Message.create({
        conversation: conversationId,
        sender: userId,
        text,
        attachments: [],
      });

      await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

      io.to(conversationId).emit('message:new', msg);
    } catch (err) {
      console.error('message:send failed', err);
    }
  });

  socket.on('message:typing', ({ conversationId, isTyping }) => {
    io.to(conversationId).emit('message:typing', { conversationId, userId, isTyping });
  });

  socket.on('message:seen', async ({ conversationId, messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (!msg.seenBy.find((id) => id.toString() === userId)) {
        msg.seenBy.push(msg.sender); // simplified, should push viewer
        msg.status = 'seen';
        await msg.save();
      }
      io.to(conversationId).emit('message:updated', msg);
    } catch (err) {
      console.error('message:seen failed', err);
    }
  });

  socket.on('message:reaction', async ({ messageId, type }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.reactions = msg.reactions.filter((r) => r.user.toString() !== userId);
      if (type) {
        msg.reactions.push({ user: msg.sender, type: type as any });
      }
      await msg.save();
      io.emit('message:updated', msg);
    } catch (err) {
      console.error('message:reaction failed', err);
    }
  });

  // WebRTC signaling forwards (simplified)
  socket.on('call:offer', (payload) => {
    io.to(payload.targetUserId).emit('call:offer', { ...payload, from: userId });
  });
  socket.on('call:answer', (payload) => {
    io.to(payload.targetUserId).emit('call:answer', { ...payload, from: userId });
  });
  socket.on('call:ice-candidate', (payload) => {
    io.to(payload.targetUserId).emit('call:ice-candidate', { ...payload, from: userId });
  });
  socket.on('call:end', (payload) => {
    io.to(payload.targetUserId).emit('call:end', { ...payload, from: userId });
  });

  socket.on('disconnect', () => {
    // TODO: mark user offline
  });
}


