'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const moduleRoutes = require('./routes/modules');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const resultRoutes = require('./routes/results');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000', 
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all for frontend routing (if using history API, though we are using separate HTML files for now)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

module.exports = app;
