import express from 'express';
import multer from 'multer';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import sharp from 'sharp';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration with environment variable support
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'https://your-radio-domain.com',
      'https://new-stars-radio-app.vercel.app'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Serve static admin interface
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'New Stars Radio - Cover Art API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      coverArt: '/api/cover-art',
      upload: '/api/cover-art/upload',
      search: '/api/cover-art/search',
      all: '/api/cover-art/all'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: ['/api/health', '/api/cover-art']
  });
});

// Export the Express app as a serverless function
export default app;

