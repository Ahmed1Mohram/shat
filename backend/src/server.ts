import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

import { registerRoutes } from './routes';
import { registerSocketHandlers } from './socket';

// ---------- CONFIG ----------

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bat-man-chat';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ---------- EXPRESS APP ----------

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ---------- SIMPLE HEALTH CHECK ----------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'bat-man-backend' });
});

// ---------- AUTH MIDDLEWARE (JWT) ----------

export interface AuthedRequest extends Request {
  userId?: string;
}

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ---------- API ROUTES ----------

registerRoutes(app, authMiddleware, JWT_SECRET);

// ---------- HTTP + SOCKET.IO ----------

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
});

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Missing auth token'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    (socket as any).userId = decoded.sub;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

// ---------- START ----------

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    httpServer.listen(PORT, () => {
      console.log(`Bat Man backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();


