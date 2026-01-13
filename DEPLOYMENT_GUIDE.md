# Vercel Deployment Guide for New Stars Radio App

This guide will walk you through deploying your projects to Vercel (frontend) and Render.com (backend).

## Overview

You have 3 components to deploy:
1. **Radio App** (frontend) → Vercel
2. **Admin Panel** (frontend) → Vercel  
3. **Backend API** (FastAPI) → Render.com

---

## Part 1: Deploy Backend to Render.com

### Why Render.com?
Vercel is for frontend apps. Your FastAPI backend needs a Python-compatible hosting service like Render.com (free tier available).

### Steps:

1. **Go to Render.com**
   - Visit https://render.com
   - Click "Get Started" and sign up with your GitHub account

2. **Create a New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository: `newstarsradio-admanager`

3. **Configure the Service**
   - **Name**: `newstars-ad-server` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `ad-server`
   - **Runtime**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```

4. **Add Environment Variables**
   Click "Advanced" and add these environment variables:
   
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   SECRET_KEY=your-super-secret-key-here-change-this
   CORS_ORIGINS=https://your-radio-app.vercel.app,https://your-admin-panel.vercel.app
   ```

   **Note**: You'll need to create a PostgreSQL database. Render offers a free PostgreSQL database:
   - Click "New +" → "PostgreSQL"
   - Copy the "Internal Database URL" 
   - Use it as your `DATABASE_URL`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Copy your backend URL: `https://newstars-ad-server.onrender.com`

---

## Part 2: Deploy Radio App to Vercel

### Steps:

1. **Push to GitHub** (if not done already)
   ```powershell
   cd "D:\MUSIC - COMEDY\New New Stars Radio App"
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit https://vercel.com
   - Click "Sign Up" and use your GitHub account
   - Click "Add New..." → "Project"

3. **Import Your Repository**
   - Find and select your `New-New-Stars-Radio-App` repository
   - Click "Import"

4. **Configure the Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `app` (click "Edit" and enter `app`)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

5. **Add Environment Variable**
   Click "Environment Variables" and add:
   
   ```
   VITE_AD_SERVER_URL=https://newstars-ad-server.onrender.com/api/v1
   ```
   
   *(Replace with your actual Render backend URL from Part 1)*

6. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at: `https://your-app-name.vercel.app`

---

## Part 3: Deploy Admin Panel to Vercel

### Steps:

1. **Add New Project in Vercel**
   - In Vercel dashboard, click "Add New..." → "Project"
   - Select the same GitHub repository
   - Click "Import"

2. **Configure the Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `ad-server/admin-panel` (click "Edit")
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Add Environment Variable**
   ```
   VITE_API_BASE_URL=https://newstars-ad-server.onrender.com/api/v1
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your admin panel will be live at: `https://your-admin-panel.vercel.app`

---

## Part 4: Update Backend CORS Settings

After deploying to Vercel, you'll have two frontend URLs. Update your backend's CORS settings:

1. **Go to Render.com Dashboard**
2. **Select your backend service**
3. **Go to "Environment"**
4. **Update `CORS_ORIGINS`**:
   ```
   CORS_ORIGINS=https://your-radio-app.vercel.app,https://your-admin-panel.vercel.app
   ```
5. **Save** (this will trigger a redeploy)

---

## Part 5: Initialize Database

After your backend is deployed, you need to create the database tables:

1. **Go to your backend URL** in browser:
   ```
   https://newstars-ad-server.onrender.com/docs
   ```

2. **Run database migrations** via Render shell:
   - In Render dashboard, go to your service
   - Click "Shell" tab
   - Run:
     ```bash
     alembic upgrade head
     ```

3. **Create admin user** (use the Swagger docs):
   - Go to `/docs` endpoint
   - Find `POST /api/v1/auth/register`
   - Create your admin account

---

## Testing Your Deployment

### Test Admin Panel:
1. Visit `https://your-admin-panel.vercel.app/login`
2. Log in with your admin credentials
3. Create an advertiser, campaign, and creative
4. Verify the creative uploaded successfully

### Test Radio App:
1. Visit `https://your-radio-app.vercel.app`
2. Check if the ad banner loads at the top
3. Verify it shows the creative you uploaded
4. Click the ad to test tracking

---

## Troubleshooting

### Issue: "Network Error" in Admin Panel
- **Check**: Is your backend URL correct in Vercel environment variables?
- **Check**: Did you update CORS_ORIGINS in Render.com?

### Issue: "401 Unauthorized"
- **Check**: Clear browser cache and cookies
- **Check**: Log out and log back in

### Issue: Ads not showing in Radio App
- **Check**: Do you have an active campaign with status "ACTIVE"?
- **Check**: Is the creative image uploaded correctly?
- **Check**: Check browser console for errors

### Issue: "Application Error" on Render.com
- **Check**: Are all environment variables set correctly?
- **Check**: Is DATABASE_URL valid?
- **Check**: View logs in Render dashboard

---

## Local Development After Deployment

To continue working locally while also having deployed versions:

1. **Don't commit `.env` files** (they're gitignored)
2. **Create local `.env` files**:

   `ad-server/admin-panel/.env`:
   ```
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

   `app/.env`:
   ```
   VITE_AD_SERVER_URL=http://localhost:8000/api/v1
   ```

3. **Run backend locally**:
   ```powershell
   cd "D:\MUSIC - COMEDY\New New Stars Radio App\ad-server"
   docker compose up
   ```

4. **Run frontend locally**:
   ```powershell
   # Admin Panel
   cd "D:\MUSIC - COMEDY\New New Stars Radio App\ad-server\admin-panel"
   npm run dev

   # Radio App
   cd "D:\MUSIC - COMEDY\New New Stars Radio App\app"
   npm run dev
   ```

---

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:

1. **Make changes** on your laptop or desktop
2. **Commit and push**:
   ```powershell
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Vercel auto-deploys** (check deployment status in Vercel dashboard)
4. **Render auto-deploys** backend (if connected to GitHub)

---

## Custom Domains (Optional)

To use your own domain like `radio.newstarsradio.com`:

1. **In Vercel Dashboard**:
   - Go to your project
   - Click "Settings" → "Domains"
   - Add your custom domain
   - Follow DNS setup instructions

2. **Update CORS** in Render with new domain

---

## Cost Breakdown

- **Vercel**: Free for personal projects (includes 2 deployments)
- **Render.com**: 
  - Free tier: Backend sleeps after 15 min of inactivity
  - Paid tier ($7/month): Always active, better performance
- **Database**: Free tier available on Render (500MB)

---

## Next Steps

1. ✅ Deploy backend to Render.com
2. ✅ Create PostgreSQL database on Render
3. ✅ Deploy Radio App to Vercel
4. ✅ Deploy Admin Panel to Vercel
5. ✅ Update CORS settings
6. ✅ Test everything works
7. ✅ Share your live URLs!

---

## Support

If you encounter issues:
1. Check the logs in Render.com and Vercel dashboards
2. Verify all environment variables are correct
3. Test locally first to isolate deployment issues

---

**Congratulations on deploying your New Stars Radio App! 🎉**


