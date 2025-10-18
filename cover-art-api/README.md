# Cover Art API for New Stars Radio

A RESTful API for managing cover art images for your radio station's songs.

## Features

- **Upload Management**: Upload and store cover art images
- **Image Processing**: Automatic resizing and thumbnail generation
- **Fast Retrieval**: Optimized database queries and caching
- **Search**: Search cover art by artist, title, or album
- **Rate Limiting**: Protection against abuse
- **Security**: Helmet.js security headers and input validation

## Quick Start

1. **Install Dependencies**
   ```bash
   cd cover-art-api
   npm install
   ```

2. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

3. **Server will run on http://localhost:3001**

## API Endpoints

### Health Check
```
GET /api/health
```

### Get Cover Art
```
GET /api/cover-art?artist=ArtistName&title=SongTitle
```

### Upload Cover Art
```
POST /api/cover-art/upload
Content-Type: multipart/form-data

Fields:
- image: Image file (max 10MB)
- artist: Artist name (required)
- title: Song title (required)
- album: Album name (optional)
```

### Get All Cover Art (Paginated)
```
GET /api/cover-art/all?page=1&limit=20
```

### Search Cover Art
```
GET /api/cover-art/search?q=search_term
```

### Get Image
```
GET /api/image/:uuid
```

### Get Thumbnail
```
GET /api/thumbnail/:uuid
```

### Delete Cover Art
```
DELETE /api/cover-art/:uuid
```

## Database

Uses SQLite for simplicity. The database file `cover_art.db` will be created automatically.

### Schema
```sql
CREATE TABLE cover_art (
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
);
```

## File Storage

- **Main Images**: Stored in `uploads/` directory (max 1200x1200px)
- **Thumbnails**: Stored in `uploads/thumbnails/` directory (300x300px)
- **Format**: All images are converted to JPEG for consistency

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)

### CORS Origins
Update the CORS configuration in `server.js` to include your frontend domain:
```javascript
origin: ['http://localhost:5173', 'http://localhost:3000', 'https://your-radio-domain.com']
```

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Upload**: 10 uploads per hour per IP

## Security Features

- Helmet.js security headers
- File type validation (images only)
- File size limits (10MB max)
- Input sanitization
- Rate limiting
- CORS protection

## Integration with Frontend

Update your frontend's metadata hook to use this API:

```javascript
// In your useMetadata hook
const fetchCustomCoverArt = async (artist, title) => {
  try {
    const response = await fetch(
      `http://localhost:3001/api/cover-art?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return `http://localhost:3001${data.imageUrl}`;
    }
  } catch (error) {
    console.log('Custom cover art not found:', error);
  }
  
  // Fallback to existing APIs (MusicBrainz, iTunes)
  return null;
};
```

## Admin Interface

Use the included admin interface to upload and manage cover art through a web UI.

## Production Deployment

1. **Database**: Consider upgrading to PostgreSQL or MySQL for production
2. **File Storage**: Consider using cloud storage (AWS S3, Google Cloud Storage)
3. **Caching**: Add Redis for better performance
4. **Load Balancing**: Use nginx or similar for load balancing
5. **SSL**: Enable HTTPS in production
6. **Monitoring**: Add logging and monitoring tools

## License

MIT License

