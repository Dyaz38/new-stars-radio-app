# Installation Guide - Cover Art API

## Quick Setup

### 1. Install Dependencies
```bash
cd cover-art-api
npm install
```

### 2. Start the API Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on **http://localhost:3001**

### 3. Access Admin Interface
Open your browser and go to: **http://localhost:3001**

### 4. Start Your Radio App
In a separate terminal:
```bash
cd app
npm run dev
```

Your radio app will be available at **http://localhost:5173**

## How It Works

### Priority System
Your radio app will now search for cover art in this order:

1. **🥇 Custom API** - Your uploaded cover art (highest priority)
2. **🥈 MusicBrainz** - Community database 
3. **🥉 iTunes** - Commercial database
4. **🎨 Gradient** - Colorful fallback

### Admin Interface Features

- **Upload Cover Art**: Add images for specific artist/song combinations
- **Search & Browse**: Find existing cover art in your database
- **Image Management**: View full-size images and delete unwanted ones
- **Automatic Processing**: Images are automatically resized and optimized

### API Integration

The frontend has been updated to automatically use your custom cover art API. No additional configuration needed!

## File Structure

```
cover-art-api/
├── server.js              # Main API server
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Admin interface
│   └── admin.js          # Admin JavaScript
├── uploads/               # Full-size images (auto-created)
├── uploads/thumbnails/    # Thumbnail images (auto-created)
└── cover_art.db          # SQLite database (auto-created)
```

## Usage Examples

### Upload Cover Art
1. Go to http://localhost:3001
2. Fill in Artist Name and Song Title
3. Select an image file
4. Click "Upload Cover Art"

### Test Integration
1. Upload cover art for a song currently playing on your radio
2. Refresh your radio app
3. The custom cover art should appear instead of external sources

## Troubleshooting

### Port Already in Use
If port 3001 is busy, change it in `server.js`:
```javascript
const PORT = process.env.PORT || 3002; // Change to 3002 or any free port
```

### CORS Issues
If you deploy the radio app to a different domain, update CORS settings in `server.js`:
```javascript
origin: ['http://localhost:5173', 'https://your-domain.com']
```

### Database Issues
Delete `cover_art.db` to reset the database (you'll lose all uploaded images).

## Production Deployment

### Environment Variables
```bash
PORT=3001                    # Server port
NODE_ENV=production         # Production mode
```

### Recommended Upgrades for Production
- Use PostgreSQL instead of SQLite
- Add Redis for caching
- Use cloud storage (AWS S3, Google Cloud)
- Enable HTTPS
- Add authentication for admin interface
- Set up monitoring and logging

## Security Notes

- The admin interface has no authentication by default
- Add authentication before deploying to production
- Rate limiting is enabled (100 requests/15min, 10 uploads/hour)
- File uploads are limited to 10MB images only

## API Documentation

See `README.md` for complete API endpoint documentation.

