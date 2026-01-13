# Deployment Architecture Diagram 🏗️

This document explains how all the pieces of your system work together in production.

---

## 🌐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐
    │  Radio   │      │  Admin   │     │ Backend  │
    │   App    │      │  Panel   │     │   API    │
    │ (Vercel) │      │ (Vercel) │     │ (Render) │
    └──────────┘      └──────────┘     └──────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   PostgreSQL    │
                   │    Database     │
                   │    (Render)     │
                   └─────────────────┘
```

---

## 📦 Component Details

### 1. Radio App (Vercel)
```
URL: https://your-radio-app.vercel.app
Technology: React + Vite + TypeScript
Purpose: Main listener-facing application
Features:
  - Stream audio player
  - Ad banner (320x50 mobile, 728x90 desktop)
  - Song metadata and album art
  - Schedule display
  - Like/favorite songs
```

**Connects To:**
- Backend API (to fetch and track ads)
- Airtime Pro API (for stream metadata)
- Third-party APIs (MusicBrainz, iTunes, Genius)

---

### 2. Admin Panel (Vercel)
```
URL: https://your-admin-panel.vercel.app
Technology: React + Vite + TypeScript
Purpose: Administrative interface for ad management
Features:
  - User authentication
  - Advertiser management
  - Campaign creation and editing
  - Creative upload and management
  - Dashboard with analytics
```

**Connects To:**
- Backend API (for all data operations)

---

### 3. Backend API (Render.com)
```
URL: https://newstars-ad-server.onrender.com
Technology: FastAPI + Python
Purpose: Core business logic and data management
Features:
  - REST API endpoints
  - JWT authentication
  - Ad selection algorithm
  - Impression/click tracking
  - Geographic targeting
  - Campaign budget management
```

**Connects To:**
- PostgreSQL Database (for all data storage)
- Radio App (serves ads, tracks events)
- Admin Panel (CRUD operations)

---

### 4. PostgreSQL Database (Render.com)
```
Type: Managed PostgreSQL
Purpose: Persistent data storage
Tables:
  - users (authentication)
  - advertisers
  - campaigns
  - creatives
  - impressions
  - clicks
  - tracking_tokens
```

**Accessed By:**
- Backend API only (Radio App and Admin Panel never directly access DB)

---

## 🔄 Data Flow Examples

### Example 1: User Visits Radio App
```
1. User opens https://your-radio-app.vercel.app
2. Browser loads React app from Vercel CDN
3. React app requests ad from Backend API
   POST /api/v1/ads/request
   {
     "width": 320,
     "height": 50,
     "placement": "top_banner",
     "location": { "city": "Miami", "state": "FL" }
   }
4. Backend queries PostgreSQL for active campaigns
5. Backend applies geographic targeting
6. Backend selects ad based on priority and budget
7. Backend returns ad creative to Radio App
8. Radio App displays ad banner
9. Backend records impression in PostgreSQL
```

### Example 2: Admin Creates Campaign
```
1. Admin logs in to https://your-admin-panel.vercel.app
2. Admin fills out campaign form
3. Admin Panel sends POST request to Backend API
   POST /api/v1/campaigns
   {
     "advertiser_id": "...",
     "name": "Summer Sale",
     "start_date": "2025-07-01",
     ...
   }
4. Backend validates data
5. Backend saves campaign to PostgreSQL
6. Backend returns created campaign
7. Admin Panel displays success message
```

### Example 3: User Clicks Ad
```
1. User clicks ad in Radio App
2. React app calls Backend API
   POST /api/v1/ads/click
   {
     "creative_id": "...",
     "tracking_token": "..."
   }
3. Backend validates tracking token
4. Backend records click in PostgreSQL
5. Backend updates campaign metrics
6. Backend returns success
7. Radio App opens advertiser's URL in new tab
```

---

## 🌍 Geographic Distribution

```
┌───────────────────────────────────────────────────────┐
│                   Vercel Edge Network                 │
│  (Automatically serves from closest location to user) │
└───────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │                               │
    [Radio App]                    [Admin Panel]
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Render Region   │
              │   (You Choose)   │
              │                  │
              │  [Backend API]   │
              │  [PostgreSQL]    │
              └──────────────────┘
```

**Performance Tips:**
- Vercel automatically uses CDN (fast worldwide)
- Choose Render region closest to majority of users
- Backend response time: ~100-300ms
- Database queries: ~10-50ms

---

## 🔒 Security Architecture

### Authentication Flow
```
1. Admin enters email + password
2. Admin Panel → Backend: POST /auth/login
3. Backend validates credentials (hashed password check)
4. Backend generates JWT token (signed with SECRET_KEY)
5. Backend → Admin Panel: Returns token + user data
6. Admin Panel stores token in localStorage
7. All subsequent requests include: Authorization: Bearer {token}
8. Backend validates token on every request
```

### CORS Configuration
```
Backend CORS_ORIGINS:
  - https://your-radio-app.vercel.app
  - https://your-admin-panel.vercel.app

Purpose:
  - Prevents unauthorized websites from accessing your API
  - Allows only your frontends to make requests
  - Browser enforces this automatically
```

### File Upload Security
```
1. Admin uploads image in Admin Panel
2. File sent as multipart/form-data
3. Backend validates:
   - File type (only images)
   - File size (max 5MB)
   - User authentication
4. Backend saves to: /app/uploads/{uuid}.{ext}
5. Backend returns URL: /uploads/{uuid}.{ext}
6. Image served by backend with proper MIME types
```

---

## 📊 Scalability Considerations

### Current Setup (Free Tier)
```
Concurrent Users: ~100-500
Backend Sleep Time: 15 minutes of inactivity
Database Size: 500MB
Bandwidth: 100GB/month (Vercel)
```

### Recommended Production Setup
```
Render Backend: $7/month (no sleep, 0.5GB RAM)
Render PostgreSQL: $7/month (1GB storage, persistent)
Vercel: Free tier is fine
Total: $14/month
```

### Future Growth (High Traffic)
```
Render Backend: Scale up to 2GB RAM ($25/mo)
PostgreSQL: Scale to 4GB ($25/mo)
Add Redis: For caching ($10/mo)
Vercel Pro: If needed ($20/mo)
Total: ~$80/month for thousands of concurrent users
```

---

## 🔄 Continuous Deployment Pipeline

```
┌──────────────┐
│  Your Laptop │
│      or      │
│   Desktop    │
└──────┬───────┘
       │ git push
       ▼
┌──────────────┐
│   GitHub     │
│  Repository  │
└──────┬───────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────┐      ┌──────────┐     ┌──────────┐
│  Vercel  │      │  Vercel  │     │  Render  │
│  (Radio) │      │ (Admin)  │     │ (Backend)│
└──────────┘      └──────────┘     └──────────┘
   Auto            Auto              Auto
   Deploy          Deploy            Deploy
   ~2 min          ~2 min            ~5 min
```

**What Happens on git push:**
1. You commit and push to GitHub main branch
2. Vercel detects changes (via webhook)
3. Vercel builds and deploys both frontends
4. Render detects changes (via webhook)
5. Render builds and deploys backend
6. All services update automatically!

---

## 🛠️ Monitoring & Debugging

### Where to Check Logs

**Backend Logs (Render):**
```
Dashboard → Your Service → Logs
See: API requests, errors, database queries
```

**Frontend Errors (Vercel):**
```
Dashboard → Project → Deployments → Deployment → Logs
See: Build errors, deployment status
```

**Browser Console (F12):**
```
Console tab: JavaScript errors
Network tab: API requests and responses
Application tab: localStorage, cookies
```

### Health Checks

**Backend Health:**
```
GET https://newstars-ad-server.onrender.com/health
Response: {"status": "ok"}
```

**Frontend Health:**
```
Visit URLs in browser
Check for console errors (F12)
Test functionality manually
```

---

## 💾 Backup Strategy

### Database Backups
- Render automatically backs up PostgreSQL
- Free tier: 7-day backup retention
- Paid tier: 30-day backup retention
- Manual backup: Use Render dashboard "Backup" button

### Code Backups
- All code is in GitHub (version controlled)
- GitHub keeps full history forever
- You can roll back to any previous version

### File Uploads (Creatives)
- Stored in backend's file system
- **Important**: On Render free tier, files are ephemeral
- **Solution**: Use cloud storage (S3, Cloudinary) for production
- Or: Backup uploads regularly via Render shell

---

## 🎯 Performance Optimization Tips

### Frontend (Vercel)
- ✅ Already optimized: Vite bundles and minifies
- ✅ Already optimized: Vercel uses global CDN
- ✅ Already optimized: Compression enabled
- 💡 Future: Add image optimization (Vercel Image)
- 💡 Future: Implement service worker for offline

### Backend (Render)
- ✅ Already optimized: FastAPI is async
- 💡 Add Redis for caching ad selections
- 💡 Add database indexes on frequently queried columns
- 💡 Use database connection pooling
- 💡 Compress API responses with gzip

### Database
- 💡 Add indexes: `campaigns.status`, `creatives.campaign_id`
- 💡 Archive old impressions/clicks to separate table
- 💡 Use database query optimization tools

---

## 🌟 Summary

Your architecture is:
- ✅ **Modern**: Latest tech stack
- ✅ **Scalable**: Can grow with your needs
- ✅ **Secure**: JWT auth, CORS, password hashing
- ✅ **Fast**: CDN for frontend, async backend
- ✅ **Maintainable**: Clean separation of concerns
- ✅ **Cost-effective**: Free tier available, cheap paid options

---

**This is a production-ready architecture used by many successful apps!** 🎉


