# Password reset emails not arriving?

The Ad Manager **only sends email if the server is configured** to use **Resend** or **SMTP**.  
If neither is set, the reset link is **only written to server logs** (e.g. Railway → Deployments → Logs) — **no message is sent to Gmail**.

### Quick check: is email configured?

Open these in a browser or `curl` (use your Railway API URL):

- `https://YOUR-RAILWAY-URL/health`
- `https://YOUR-RAILWAY-URL/api/v1/health`

Look for **`password_reset_email_delivery`**:

| Value   | Meaning |
|--------|---------|
| `resend` | Resend API is configured (`RESEND_API_KEY` set). |
| `smtp`   | SMTP is configured (`SMTP_HOST` + `SMTP_USER`). |
| `none`   | **No outbound email** — configure Resend or SMTP, or copy the link from logs. |

On startup, the server logs either `Password reset email delivery: resend|smtp` or a **warning** that emails are not delivered.

### Admin panel must call the right API (Vercel)

The React app uses `VITE_API_BASE_URL` (see `admin-panel/.env.example`). If it points at `localhost` while you use the live site, forgot-password hits the wrong server.

Set in **Vercel → Project → Environment Variables**:

`VITE_API_BASE_URL` = `https://YOUR-RAILWAY-APP.up.railway.app/api/v1`

Redeploy the admin panel after changing it.

## 1. Use the correct admin email

The address you type on “Forgot password?” must be **exactly** the email stored for an **active** admin user in PostgreSQL.

- Default seed user is often: `admin@newstarsradio.com`  
- If you request a reset for **another** address (e.g. a personal Gmail that is **not** in the database), the app **still shows success** (to prevent account guessing) but **sends nothing**.

**Fix:** Use the same email you use to sign in to Ad Manager, or add your Gmail as a user in the DB / change the admin email.

---

## 2. Configure email delivery on Railway (pick one)

### Option A — Resend (recommended)

1. Create a free account at [resend.com](https://resend.com) and create an **API key**.
2. In Railway → your **ad-server** service → **Variables**, add:
   - `RESEND_API_KEY` = your API key  
   - `RESEND_FROM` = a sender Resend allows (after you [verify a domain](https://resend.com/docs/dashboard/domains/introduction), e.g. `Ad Manager <noreply@yourdomain.com>`).  
     Until a domain is verified, you may be limited to Resend’s test sender; follow Resend’s dashboard instructions.
3. Redeploy the service.

The app tries **Resend first**, then SMTP.

**Important:** With Resend’s default test domain (`onboarding@resend.dev`), you can usually only send to **the email address you used to sign up for Resend** until you **verify your own domain**. If your Ad Manager user is `admin@newstarsradio.com` but Resend rejects the send, either:

- [Verify `newstarsradio.com` (or another domain)](https://resend.com/docs/dashboard/domains/introduction) and set `RESEND_FROM` to an address on that domain, **or**
- Use **Gmail SMTP** (Option B) to deliver to any inbox, **or**
- Temporarily add a user whose email matches an address Resend can send to (for testing only).

If Resend returns an error, check **Railway logs** — the API now logs the HTTP status and response body from Resend (truncated) to help debug.

### Option B — Gmail SMTP

1. In Google Account → **Security** → enable **2-Step Verification**.
2. Create an **App password** (App: Mail, Device: Other).
3. In Railway → Variables, add:

| Variable        | Example value              |
|----------------|----------------------------|
| `SMTP_HOST`    | `smtp.gmail.com`           |
| `SMTP_PORT`    | `587`                      |
| `SMTP_USER`    | your full Gmail address    |
| `SMTP_PASSWORD`| the 16-character app password |
| `SMTP_FROM`    | same as `SMTP_USER` or `Name <you@gmail.com>` |
| `SMTP_USE_TLS` | `true`                     |

4. Redeploy.

---

## 3. Confirm `FRONTEND_ADMIN_URL`

Reset links use:

`FRONTEND_ADMIN_URL` + `/reset-password?token=...`

Set it to your live admin URL, e.g.:

`https://newstarsadminpanel.vercel.app`

(Railway → Variables.)

---

## 4. Still nothing in Gmail?

- Wait a few minutes; check **Spam**, **Promotions**, and **All Mail**.
- Search Gmail for: `Ad Manager` or `Reset your`.
- Check Railway **Logs** for errors from Resend or SMTP.
- Ensure the **from** address/domain is verified (Resend / Gmail policies).

---

## 5. Temporary workaround (no SMTP/Resend)

After requesting a reset, open **Railway → ad-server → Logs** and search for:

`PASSWORD RESET: no email delivery configured`

The log line includes the **full reset URL** you can paste into the browser (one-time use, 1 hour).
