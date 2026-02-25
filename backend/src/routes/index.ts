import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AuthedRequest } from '../server';

export function registerRoutes(
  app: Express,
  auth: (req: AuthedRequest, res: Response, next: () => void) => void,
  jwtSecret: string
) {
  // -------- AUTH --------

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) return res.status(409).json({ message: 'User already exists' });

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ username, email, passwordHash: hash });

      const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // -------- CONVERSATIONS --------

  app.get('/api/conversations', auth, async (req: AuthedRequest, res) => {
    try {
      const convs = await Conversation.find({ participants: req.userId }).sort({ updatedAt: -1 });
      res.json(convs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load conversations' });
    }
  });

  app.post('/api/conversations', auth, async (req: AuthedRequest, res) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: 'participantId required' });

      const existing = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [req.userId, participantId], $size: 2 },
      });
      if (existing) return res.json(existing);

      const conv = await Conversation.create({
        isGroup: false,
        participants: [req.userId, participantId],
        admins: [req.userId],
      });

      res.status(201).json(conv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  // -------- MESSAGES BASIC REST (most realtime via socket) --------

  app.get('/api/conversations/:id/messages', auth, async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      const msgs = await Message.find({ conversation: id }).sort({ createdAt: 1 });
      res.json(msgs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load messages' });
    }
  });

  // Minimal send via REST (socket.io سيغطي الجزء المباشر)
  app.post('/api/conversations/:id/messages', auth, async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;
      const msg = await Message.create({
        conversation: id,
        sender: req.userId,
        text,
        attachments: [],
      });
      res.status(201).json(msg);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });
}


