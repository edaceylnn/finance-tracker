import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/auth';
import recordRoutes from './routes/records';
import recurringRecordRoutes from './routes/recurringRecords';
import metalsRoutes from './routes/metals';

dotenv.config();

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'] as const;
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[startup] Create a .env file with these variables and restart.');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const app = express();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://10.0.2.2:8081',
];

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/records', recordRoutes);
app.use('/recurring-records', recurringRecordRoutes);
app.use('/metals', metalsRoutes);

app.listen(3001, () => console.log('Backend running on port 3001'));
