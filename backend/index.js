require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const recordRoutes = require('./routes/records');

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/records', recordRoutes);

app.listen(3001, () => console.log('Backend running on port 3001'));
