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
const PORT = process.env.PORT || 3001;

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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Upload rate limiting (more restrictive)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: 'Too many uploads from this IP, please try again later.'
});

// Ensure directories exist
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMBNAILS_DIR = path.join(__dirname, 'uploads', 'thumbnails');

try {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
} catch (error) {
  console.error('Error creating directories:', error);
}

// Database setup
const db = new sqlite3.Database('./cover_art.db');

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS cover_art (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      album TEXT,
      filename TEXT NOT NULL,
      thumbnail_filename TEXT NOT NULL,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      mime_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(artist, title)
    )
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_artist_title ON cover_art(artist, title);
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_uuid ON cover_art(uuid);
  `);
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to normalize strings for comparison
const normalizeString = (str) => {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Helper function to generate filename
const generateFilename = (artist, title, ext) => {
  const normalized = `${normalizeString(artist)}_${normalizeString(title)}`.replace(/\s+/g, '_');
  return `${normalized}_${Date.now()}${ext}`;
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get cover art by artist and title
app.get('/api/cover-art', (req, res) => {
  const { artist, title } = req.query;
  
  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title are required' });
  }
  
  const normalizedArtist = normalizeString(artist);
  const normalizedTitle = normalizeString(title);
  
  db.get(
    `SELECT * FROM cover_art 
     WHERE LOWER(REPLACE(REPLACE(artist, ' ', ''), '-', '')) = ? 
     AND LOWER(REPLACE(REPLACE(title, ' ', ''), '-', '')) = ?`,
    [normalizedArtist.replace(/\s/g, ''), normalizedTitle.replace(/\s/g, '')],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Cover art not found' });
      }
      
      res.json({
        id: row.uuid,
        artist: row.artist,
        title: row.title,
        album: row.album,
        imageUrl: `/api/image/${row.uuid}`,
        thumbnailUrl: `/api/thumbnail/${row.uuid}`,
        width: row.width,
        height: row.height,
        createdAt: row.created_at
      });
    }
  );
});

// Get all cover art (with pagination)
app.get('/api/cover-art/all', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // Get total count
  db.get('SELECT COUNT(*) as total FROM cover_art', (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get paginated results
    db.all(
      `SELECT * FROM cover_art 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        const coverArt = rows.map(row => ({
          id: row.uuid,
          artist: row.artist,
          title: row.title,
          album: row.album,
          imageUrl: `/api/image/${row.uuid}`,
          thumbnailUrl: `/api/thumbnail/${row.uuid}`,
          width: row.width,
          height: row.height,
          createdAt: row.created_at
        }));
        
        res.json({
          coverArt,
          pagination: {
            page,
            limit,
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / limit)
          }
        });
      }
    );
  });
});

// Upload cover art
app.post('/api/cover-art/upload', uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { artist, title, album } = req.body;
    
    if (!artist || !title) {
      return res.status(400).json({ error: 'Artist and title are required' });
    }
    
    const uuid = uuidv4();
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = generateFilename(artist, title, ext);
    const thumbnailFilename = generateFilename(artist, title, '_thumb' + ext);
    
    // Process the image with Sharp
    const imageBuffer = req.file.buffer;
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Resize and optimize main image (max 1200x1200)
    const processedImage = await image
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Create thumbnail (300x300)
    const thumbnail = await image
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Save files
    const mainImagePath = path.join(UPLOAD_DIR, filename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
    
    await fs.writeFile(mainImagePath, processedImage);
    await fs.writeFile(thumbnailPath, thumbnail);
    
    // Save to database
    db.run(
      `INSERT OR REPLACE INTO cover_art 
       (uuid, artist, title, album, filename, thumbnail_filename, file_size, width, height, mime_type, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        uuid,
        artist,
        title,
        album || null,
        filename,
        thumbnailFilename,
        processedImage.length,
        metadata.width,
        metadata.height,
        'image/jpeg'
      ],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save cover art info' });
        }
        
        res.json({
          id: uuid,
          artist,
          title,
          album,
          imageUrl: `/api/image/${uuid}`,
          thumbnailUrl: `/api/thumbnail/${uuid}`,
          width: metadata.width,
          height: metadata.height,
          message: 'Cover art uploaded successfully'
        });
      }
    );
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Serve images
app.get('/api/image/:uuid', (req, res) => {
  const { uuid } = req.params;
  
  db.get('SELECT filename FROM cover_art WHERE uuid = ?', [uuid], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    try {
      const imagePath = path.join(UPLOAD_DIR, row.filename);
      const imageBuffer = await fs.readFile(imagePath);
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(imageBuffer);
    } catch (error) {
      res.status(404).json({ error: 'Image file not found' });
    }
  });
});

// Serve thumbnails
app.get('/api/thumbnail/:uuid', (req, res) => {
  const { uuid } = req.params;
  
  db.get('SELECT thumbnail_filename FROM cover_art WHERE uuid = ?', [uuid], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    
    try {
      const thumbnailPath = path.join(THUMBNAILS_DIR, row.thumbnail_filename);
      const thumbnailBuffer = await fs.readFile(thumbnailPath);
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(thumbnailBuffer);
    } catch (error) {
      res.status(404).json({ error: 'Thumbnail file not found' });
    }
  });
});

// Delete cover art
app.delete('/api/cover-art/:uuid', (req, res) => {
  const { uuid } = req.params;
  
  db.get('SELECT filename, thumbnail_filename FROM cover_art WHERE uuid = ?', [uuid], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Cover art not found' });
    }
    
    try {
      // Delete files
      const mainImagePath = path.join(UPLOAD_DIR, row.filename);
      const thumbnailPath = path.join(THUMBNAILS_DIR, row.thumbnail_filename);
      
      await fs.unlink(mainImagePath).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(thumbnailPath).catch(() => {}); // Ignore if file doesn't exist
      
      // Delete from database
      db.run('DELETE FROM cover_art WHERE uuid = ?', [uuid], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete cover art' });
        }
        
        res.json({ message: 'Cover art deleted successfully' });
      });
      
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete cover art' });
    }
  });
});

// Search cover art
app.get('/api/cover-art/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const searchTerm = `%${q}%`;
  
  db.all(
    `SELECT * FROM cover_art 
     WHERE artist LIKE ? OR title LIKE ? OR album LIKE ?
     ORDER BY created_at DESC 
     LIMIT 50`,
    [searchTerm, searchTerm, searchTerm],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      const results = rows.map(row => ({
        id: row.uuid,
        artist: row.artist,
        title: row.title,
        album: row.album,
        imageUrl: `/api/image/${row.uuid}`,
        thumbnailUrl: `/api/thumbnail/${row.uuid}`,
        width: row.width,
        height: row.height,
        createdAt: row.created_at
      }));
      
      res.json({ results });
    }
  );
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Export for Vercel serverless (production)
export default app;

// Start server for local development only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🎵 Cover Art API server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
    console.log(`🖼️ Thumbnails directory: ${THUMBNAILS_DIR}`);
  });

  // Graceful shutdown (local only)
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
}
