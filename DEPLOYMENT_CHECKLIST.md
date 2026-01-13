# Quick Deployment Checklist ✅

Follow these steps in order to deploy your New Stars Radio App to production.

---

## Before You Start

- [ ] Have a GitHub account (you already have this ✓)
- [ ] Code is pushed to GitHub (check your repository)
- [ ] Docker is running locally for testing

---

## Step 1: Create Accounts

- [ ] Sign up at https://render.com (use GitHub login)
- [ ] Sign up at https://vercel.com (use GitHub login)

---

## Step 2: Deploy Backend (Render.com)

### Create PostgreSQL Database

- [ ] Log in to Render.com
- [ ] Click "New +" → "PostgreSQL"
- [ ] Name: `newstars-ad-db`
- [ ] Region: Select closest to your users
- [ ] Click "Create Database"
- [ ] **COPY** the "Internal Database URL" (you'll need this!)

### Create Web Service

- [ ] Click "New +" → "Web Service"
- [ ] Select "Build and deploy from a Git repository"
- [ ] Click "Next"
- [ ] Connect to GitHub and select `newstarsradio-admanager` repo
- [ ] Click "Connect"

### Configure Service

- [ ] **Name**: `newstars-ad-server`
- [ ] **Region**: Same as database
- [ ] **Branch**: `main`
- [ ] **Root Directory**: `ad-server`
- [ ] **Runtime**: `Python 3`
- [ ] **Build Command**: `pip install -r requirements.txt`
- [ ] **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Add Environment Variables

Click "Advanced" → "Add Environment Variable" for each:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *(Paste the Internal Database URL you copied)* |
| `SECRET_KEY` | `your-super-secret-random-string-here-change-this` |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` *(update later)* |

- [ ] Click "Create Web Service"
- [ ] Wait 5-10 minutes for deployment
- [ ] **COPY** your backend URL: `https://newstars-ad-server.onrender.com`
- [ ] Test it: Visit `https://newstars-ad-server.onrender.com/docs`

### Initialize Database

- [ ] In Render dashboard, click on your service
- [ ] Click "Shell" tab (top right)
- [ ] Run: `alembic upgrade head`
- [ ] Wait for "Running upgrade" messages
- [ ] Database is ready!

---

## Step 3: Deploy Radio App (Vercel)

- [ ] Log in to Vercel.com
- [ ] Click "Add New..." → "Project"
- [ ] Find `New-New-Stars-Radio-App` repository
- [ ] Click "Import"

### Configure Project

- [ ] **Framework Preset**: Vite (auto-detected)
- [ ] Click "Edit" next to Root Directory
- [ ] **Root Directory**: `app`
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`

### Add Environment Variable

- [ ] Click "Environment Variables"
- [ ] Add variable:
  - **Name**: `VITE_AD_SERVER_URL`
  - **Value**: `https://newstars-ad-server.onrender.com/api/v1` *(your backend URL)*
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes
- [ ] **COPY** your Radio App URL: `https://your-radio-app.vercel.app`

---

## Step 4: Deploy Admin Panel (Vercel)

- [ ] In Vercel, click "Add New..." → "Project"
- [ ] Select `New-New-Stars-Radio-App` repository again
- [ ] Click "Import"

### Configure Project

- [ ] **Framework Preset**: Vite
- [ ] Click "Edit" next to Root Directory
- [ ] **Root Directory**: `ad-server/admin-panel`
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`

### Add Environment Variable

- [ ] Click "Environment Variables"
- [ ] Add variable:
  - **Name**: `VITE_API_BASE_URL`
  - **Value**: `https://newstars-ad-server.onrender.com/api/v1` *(your backend URL)*
- [ ] Click "Deploy"
- [ ] Wait 2-3 minutes
- [ ] **COPY** your Admin Panel URL: `https://your-admin-panel.vercel.app`

---

## Step 5: Update CORS Settings

Now that you have your frontend URLs, update backend CORS:

- [ ] Go back to Render.com dashboard
- [ ] Click on your `newstars-ad-server` service
- [ ] Click "Environment" in left sidebar
- [ ] Find `CORS_ORIGINS` variable
- [ ] Click "Edit"
- [ ] Update value to:
  ```
  https://your-radio-app.vercel.app,https://your-admin-panel.vercel.app
  ```
  *(Replace with your actual Vercel URLs - NO SPACES after comma)*
- [ ] Click "Save Changes"
- [ ] Backend will automatically redeploy (2-3 minutes)

---

## Step 6: Create Admin Account

- [ ] Visit `https://newstars-ad-server.onrender.com/docs`
- [ ] Find `POST /api/v1/auth/register`
- [ ] Click "Try it out"
- [ ] Fill in:
  ```json
  {
    "email": "admin@newstarsradio.com",
    "password": "your-secure-password",
    "full_name": "Admin User"
  }
  ```
- [ ] Click "Execute"
- [ ] You should see a success response

---

## Step 7: Test Everything

### Test Admin Panel

- [ ] Visit your admin panel URL
- [ ] Log in with credentials from Step 6
- [ ] Dashboard should load successfully
- [ ] Go to "Advertisers" → Create a test advertiser
- [ ] Go to "Campaigns" → Create a test campaign
- [ ] Go to "Creatives" → Upload a test ad image
- [ ] Everything works? ✅

### Test Radio App

- [ ] Visit your radio app URL
- [ ] Radio player should load
- [ ] Check the ad banner at the top
- [ ] Ad should display (might take a refresh)
- [ ] Click the ad (should track click)
- [ ] Everything works? ✅

---

## Step 8: Update Local Environment (Optional)

To keep working locally with local backend:

- [ ] Run: `.\setup-env.ps1`
- [ ] This creates `.env` files for local development
- [ ] Start backend: `cd ad-server && docker compose up`
- [ ] Start admin: `cd ad-server\admin-panel && npm run dev`
- [ ] Start radio app: `cd app && npm run dev`

---

## Troubleshooting

### Admin Panel shows "Network Error"
- Check: Is backend URL correct in Vercel environment variables?
- Check: Did you update CORS_ORIGINS?
- Check: Is backend service running on Render?

### Ads not showing in Radio App
- Check: Do you have an ACTIVE campaign? (not DRAFT)
- Check: Is creative image uploaded?
- Check: Browser console for errors (F12)

### Backend shows "Application Error"
- Check: All environment variables set?
- Check: DATABASE_URL is valid?
- Check: Logs in Render dashboard

---

## You're Done! 🎉

Your New Stars Radio App is now live!

**Your URLs:**
- Radio App: `https://your-radio-app.vercel.app`
- Admin Panel: `https://your-admin-panel.vercel.app`
- Backend API: `https://newstars-ad-server.onrender.com`

**Next Steps:**
- Share your radio app with listeners
- Create real advertisers and campaigns
- Monitor performance in the dashboard
- Consider upgrading Render to paid tier ($7/mo) for 24/7 uptime

---

## Future Updates

When you make changes:

1. **Commit and push** to GitHub:
   ```powershell
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Vercel automatically deploys** your frontend changes

3. **Render automatically deploys** your backend changes

---

**Questions? Check the full DEPLOYMENT_GUIDE.md for detailed explanations!**


