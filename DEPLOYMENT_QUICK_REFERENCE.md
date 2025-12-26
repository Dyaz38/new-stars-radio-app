# Deployment Quick Reference Card 📋

Keep this handy during deployment!

---

## 🔗 Important URLs

### Services to Sign Up
- **Render.com**: https://render.com
- **Vercel.com**: https://vercel.com

### Your Production URLs (fill in after deployment)
```
Backend API:    https://_________________.onrender.com
Radio App:      https://_________________.vercel.app
Admin Panel:    https://_________________.vercel.app
API Docs:       https://_________________.onrender.com/docs
```

---

## 🔑 Environment Variables

### Backend (Render.com)
```
DATABASE_URL=postgresql://[from-render-postgresql-service]
SECRET_KEY=your-super-secret-key-change-this
CORS_ORIGINS=https://your-radio.vercel.app,https://your-admin.vercel.app
```

### Radio App (Vercel)
```
VITE_AD_SERVER_URL=https://your-backend.onrender.com/api/v1
```

### Admin Panel (Vercel)
```
VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1
```

---

## 📂 Vercel Root Directories

| Project | Root Directory |
|---------|----------------|
| Radio App | `app` |
| Admin Panel | `ad-server/admin-panel` |

---

## 🐍 Backend Configuration (Render.com)

```
Root Directory:  ad-server
Runtime:         Python 3
Build Command:   pip install -r requirements.txt
Start Command:   uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## 💻 Local Development Commands

### Setup Environment
```powershell
.\setup-env.ps1
```

### Start Backend
```powershell
cd "D:\MUSIC - COMEDY\New New Stars Radio App\ad-server"
docker compose up
```

### Start Admin Panel
```powershell
cd "D:\MUSIC - COMEDY\New New Stars Radio App\ad-server\admin-panel"
npm run dev
```

### Start Radio App
```powershell
cd "D:\MUSIC - COMEDY\New New Stars Radio App\app"
npm run dev
```

---

## 🔄 Deploy Updates

```powershell
cd "D:\MUSIC - COMEDY\New New Stars Radio App"
git add .
git commit -m "Your update message"
git push origin main
```

Vercel and Render will automatically deploy your changes!

---

## 🗄️ Database Commands (Render Shell)

### Run Migrations
```bash
alembic upgrade head
```

### Check Current Version
```bash
alembic current
```

### Create Migration (after model changes)
```bash
alembic revision --autogenerate -m "Description of changes"
```

---

## 🧪 Testing Endpoints

### Test Backend Health
```
GET https://your-backend.onrender.com/health
```

### Test API Docs
```
https://your-backend.onrender.com/docs
```

### Register Admin User
```
POST https://your-backend.onrender.com/api/v1/auth/register
Body: {
  "email": "admin@newstarsradio.com",
  "password": "your-password",
  "full_name": "Admin User"
}
```

---

## 🚨 Common Issues & Fixes

### "Network Error" in Frontend
```
✅ Check: Environment variables in Vercel
✅ Check: CORS_ORIGINS in Render
✅ Check: Backend is running (not sleeping)
```

### "401 Unauthorized"
```
✅ Clear browser cache/cookies
✅ Log out and log back in
✅ Check token in localStorage (F12 → Application)
```

### Ads Not Showing
```
✅ Campaign status is ACTIVE (not DRAFT)
✅ Creative image uploaded correctly
✅ Check browser console (F12)
✅ Check API response in Network tab
```

### Backend "Application Error"
```
✅ All environment variables set correctly
✅ DATABASE_URL is valid
✅ Check logs in Render dashboard
✅ Run database migrations
```

---

## 📊 Monitoring

### Render.com
- View logs: Dashboard → Service → Logs
- View metrics: Dashboard → Service → Metrics
- Shell access: Dashboard → Service → Shell

### Vercel
- View logs: Dashboard → Project → Deployments → Click deployment
- View analytics: Dashboard → Project → Analytics
- Environment vars: Dashboard → Project → Settings → Environment Variables

---

## 💰 Pricing

### Free Tier (What You Start With)
- **Vercel**: 2 projects, 100GB bandwidth/month
- **Render**: Backend sleeps after 15 min inactivity
- **Render PostgreSQL**: 500MB storage, 90 day expiration

### Paid Upgrades
- **Render Web Service**: $7/mo (24/7 uptime, no sleep)
- **Render PostgreSQL**: $7/mo (1GB storage, no expiration)
- **Vercel Pro**: $20/mo (more bandwidth, custom domains)

---

## 📱 Mobile Testing

### Test on Mobile
1. Open your Vercel URL on phone: `https://your-radio.vercel.app`
2. Check ad banner shows 320x50 size
3. Test radio player works
4. Check responsive design

### Test on Desktop
1. Open Vercel URL in browser
2. Check ad banner shows 728x90 size
3. Test all features

---

## 🎯 Post-Deployment Checklist

- [ ] All three services deployed successfully
- [ ] CORS updated with production URLs
- [ ] Database migrations run
- [ ] Admin account created
- [ ] Test advertiser/campaign/creative created
- [ ] Ads showing in radio app
- [ ] Mobile responsive working
- [ ] All environment variables set
- [ ] Local development still works

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Vite Docs**: https://vitejs.dev

---

**Print this page and keep it nearby while deploying! 📄**

