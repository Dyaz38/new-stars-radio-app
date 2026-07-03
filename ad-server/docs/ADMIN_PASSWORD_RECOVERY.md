# Backup admin password recovery (when email reset is unavailable)

Use this when you **cannot sign in** to Ad Manager and **forgot-password email** is not working (no Resend/SMTP, wrong inbox, etc.).

There are **two recovery paths** — try them in order.

---

## Path 1 — Email reset (preferred)

1. Open your admin panel → **Forgot password?**
2. Enter the **exact** admin email (default: `admin@newstarsradio.com`)
3. Check email (or Railway logs if email is not configured — see [PASSWORD_RESET_EMAIL.md](./PASSWORD_RESET_EMAIL.md))
4. Open the link → set a new password → sign in

---

## Path 2 — Railway backup reset (no email needed)

This uses environment variables on your **Railway ad-server** service. The server resets the admin password **once on startup**, then you **remove the variables**.

### Step 1 — Add variables in Railway

Railway → **ad-server** service → **Variables**:

| Variable | Value | Notes |
|---|---|---|
| `ADMIN_PASSWORD_RESET` | `true` | Enables one-time reset on deploy |
| `ADMIN_RESET_PASSWORD` | *(your choice)* | Strong **temporary** password (8+ chars). **Required for production.** |
| `ADMIN_RESET_EMAIL` | `admin@newstarsradio.com` | Optional — only if your admin uses a different email |

Example temporary password: a random 12+ character string you will change after login.

### Step 2 — Redeploy

Trigger a **Redeploy** (or push any commit). Watch **Deploy Logs** for:

```text
✓ Backup admin password reset applied for admin@newstarsradio.com
⚠️  Remove ADMIN_PASSWORD_RESET (and ADMIN_RESET_PASSWORD) from Railway now.
```

### Step 3 — Sign in

1. Open Ad Manager (e.g. `https://newstarsadminpanel.vercel.app`)
2. Email: `admin@newstarsradio.com` (or your `ADMIN_RESET_EMAIL`)
3. Password: the value you set in `ADMIN_RESET_PASSWORD`

### Step 4 — Clean up (important)

In Railway, **delete** these variables (or set `ADMIN_PASSWORD_RESET` to `false`):

- `ADMIN_PASSWORD_RESET`
- `ADMIN_RESET_PASSWORD`

Redeploy again. Leaving `ADMIN_PASSWORD_RESET=true` would reset your password on **every** deploy.

### Step 5 — Set a permanent password

After sign-in: **Settings → change password** (or use Forgot password once email is configured).

---

## Verify recovery mode is off

Open:

`https://YOUR-RAILWAY-URL/health`

Check:

```json
"admin_password_reset_enabled": false
```

If `true`, remove `ADMIN_PASSWORD_RESET` from Railway and redeploy.

---

## Security notes

- Never commit `ADMIN_RESET_PASSWORD` to git — Railway variables only.
- Do not share the temporary password in chat or email longer than needed.
- The default seed password `changeme123` is only for **first install** in development — change it immediately in production.
- If `ADMIN_RESET_PASSWORD` is omitted, the server falls back to the initial seed password and logs a warning — always set a custom temp password in production.

---

## Still locked out?

1. Confirm `FRONTEND_ADMIN_URL` and `VITE_API_BASE_URL` point at your live admin + API URLs.
2. Confirm the admin user exists and is active (Railway Postgres → `users` table).
3. Check Railway deploy logs for seed errors on startup.
4. See also: [PASSWORD_RESET_EMAIL.md](./PASSWORD_RESET_EMAIL.md)
