# Deploy Frontend to Vercel – Step-by-Step

Follow these steps to deploy the New Stars Radio app to Vercel.

---

## 1. Push to GitHub (if not done)

```powershell
cd "D:\MUSIC - COMEDY\New New Stars Radio App"
git add .
git commit -m "Your message"
git push origin main
```

---

## 2. Go to Vercel

1. Open **https://vercel.com**
2. Sign in with **GitHub** (use the same account that has your repo)

---

## 3. Import the Project

1. Click **"Add New..."** → **"Project"**
2. Find **New New Stars Radio App** (or your repo name)
3. Click **"Import"**

---

## 4. Configure the Project

| Setting | Value |
|--------|--------|
| **Framework Preset** | Vite (should auto-detect) |
| **Root Directory** | Click **Edit** → enter `app` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |

---

## 5. Add Environment Variable

1. Expand **"Environment Variables"**
2. Add:
   - **Name:** `VITE_AD_SERVER_URL`
   - **Value:** `https://new-stars-radio-app-production.up.railway.app/api/v1`
3. Leave environment as **Production** (or add for Preview too if you want)

---

## 6. Deploy

1. Click **"Deploy"**
2. Wait 2–4 minutes for the build
3. When it finishes, you’ll get a URL like: `https://your-project.vercel.app`

---

## 7. Update Railway CORS

After deployment you’ll have a Vercel URL (e.g. `https://new-stars-radio-xxx.vercel.app`).

1. Go to **https://railway.app** → your project
2. Open your **new-stars-radio-app** service
3. Go to **Variables**
4. Add or edit **CORS_ORIGINS** and set it to:
   ```
   http://localhost:5173,http://localhost:3000,https://YOUR-VERCEL-URL.vercel.app
   ```
   (Replace `YOUR-VERCEL-URL` with your actual Vercel URL)
5. Save; Railway will redeploy automatically

---

## Done

- **Frontend:** `https://your-project.vercel.app`
- **API:** `https://new-stars-radio-app-production.up.railway.app`

Test the live app; the ad banner should call the Railway API. If you see "No ads available", that’s expected until you create campaigns in the admin panel.
