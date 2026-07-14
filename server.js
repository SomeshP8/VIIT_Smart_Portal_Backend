import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import lostFoundRoutes from './routes/lostFoundRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Resolve current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Allowed origins: support multiple (localhost dev + Vercel production frontend)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://viit-smart-portal-frontend.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list or is a Vercel deployment
    const isAllowed = allowedOrigins.some(allowed => 
      allowed && origin.startsWith(allowed.replace(/\/$/, ''))
    ) || origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true,
};

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(allowed => 
        allowed && origin.startsWith(allowed.replace(/\/$/, ''))
      ) || origin.endsWith('.vercel.app');
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Expose Socket.io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded static files if using local disk storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/lost-found', lostFoundRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to VIIT Smart Campus Platform API' });
});

// Socket Connection Logic
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join_user', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  socket.on('join_campus_group', ({ department, year }) => {
    const groupName = `${department}_Year${year}`;
    socket.join(groupName);
    console.log(`User joined campus group room: ${groupName}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
