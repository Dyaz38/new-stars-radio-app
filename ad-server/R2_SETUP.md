# Cloudflare R2 Setup for Creative Uploads

When R2 is configured, ad creatives uploaded from the admin panel are stored in Cloudflare R2 instead of local disk. This enables **direct upload from your PC** on Railway (where the filesystem is read-only).

## 1. Create an R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket**
3. Name it (e.g. `newstars-creatives`)
4. Click **Create bucket**

## 2. Enable Public Access

1. Open your bucket → **Settings**
2. Under **Public access**, click **Allow Access**
3. Note the **Public bucket URL** (e.g. `https://pub-xxxxxxxxxxxxx.r2.dev`) — this is your `R2_PUBLIC_URL`

## 3. Create API Tokens

1. In R2, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Give it a name (e.g. `ad-server`)
4. Set **Object Read & Write** permissions
5. Click **Create API Token**
6. Copy the **Access Key ID** and **Secret Access Key** (you won't see the secret again)

## 4. Get Your Account ID

- Cloudflare Dashboard → any page; the Account ID is in the right sidebar under **Account ID**
- Or from the R2 bucket URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...`

## 5. Add Variables to Railway

In your Railway project → **Variables**, add:

| Variable | Value |
|----------|-------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Access Key ID from step 3 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key from step 3 |
| `R2_BUCKET_NAME` | Your bucket name (e.g. `newstars-creatives`) |
| `R2_PUBLIC_URL` | Public bucket URL (e.g. `https://pub-xxxxx.r2.dev`) |

## 6. Redeploy

Railway will redeploy automatically. After that, creative uploads from your PC will work.

## Fallback

Without R2, the app falls back to local disk (works in dev; fails on Railway). You can still use **Image URL** in the admin panel to add creatives by pasting a direct image link.
