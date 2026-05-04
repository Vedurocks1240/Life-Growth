# Life Growth — Web Dashboard & Backend

> Vercel-hosted Next.js dashboard for the Life Growth Android discipline tracker.

---

## Project Structure

```
life-growth/
├── app/
│   ├── layout.js
│   ├── globals.css
│   ├── page.js                        ← Full dashboard (login + stats)
│   └── api/
│       ├── auth/
│       │   ├── register/route.js      ← POST /api/auth/register
│       │   └── login/route.js         ← POST /api/auth/login
│       └── sync/
│           ├── usage/route.js         ← POST + GET /api/sync/usage
│           └── profile/route.js       ← POST + GET /api/sync/profile
├── lib/
│   ├── db.js                          ← Vercel Postgres client
│   └── auth.js                        ← SHA-256 hashing (mirrors Android)
├── sql/
│   └── schema.sql                     ← Run once to set up tables
└── .env.local.example
```

---

## Setup Guide

### 1 — Create a GitHub Repo

```bash
cd life-growth
git init
git add .
git commit -m "Initial Life Growth backend"
git remote add origin https://github.com/YOUR_USERNAME/life-growth-web.git
git push -u origin main
```

### 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** — leave all defaults

### 3 — Add Vercel Postgres Database

1. In your Vercel project → **Storage** tab
2. Click **Create Database** → choose **Postgres**
3. Name it `life-growth-db` → **Create**
4. Click **Connect to Project** — this auto-injects all `POSTGRES_*` env vars

### 4 — Run the SQL Schema

1. In Vercel → your Postgres database → **Query** tab
2. Paste the contents of `sql/schema.sql`
3. Click **Run Query**

You should see the tables created:
- `schema_version`
- `user_profile`
- `usage_stats`
- `app_usage`

### 5 — Redeploy

After adding the database, trigger a redeploy so the env vars take effect:

```
Vercel Dashboard → Deployments → ⋯ → Redeploy
```

---

## API Reference

### `POST /api/auth/register`

Called by the Android app on first launch.

```json
{
  "userId":       "550e8400-e29b-41d4-a716-446655440000",
  "username":     "alice",
  "passwordHash": "a3f...64-char-hex",
  "level":        1,
  "monthlyScore": 10.0,
  "isLoggedIn":   false
}
```

**Responses:** `201 Created` · `400 Bad Request` · `409 Conflict (username taken)`

---

### `POST /api/auth/login`

```json
{
  "username":     "alice",
  "passwordHash": "a3f...64-char-hex"
}
```

**Hash algorithm (must match Android exactly):**
```
salt = reverse(username) + "LifeGrowth_2024"
hash = SHA-256(password + salt)   →  lowercase hex
```

**Response:** Full `UserProfileEntity`

---

### `POST /api/sync/usage`

```json
{
  "userId":             "uuid",
  "date":               "2025-05-04",
  "screenTimeMinutes":  195,
  "unlockCount":        34,
  "idleWorthScore":     8.8,
  "aiInsight":          "Outstanding discipline today.",
  "appUsage": [
    { "appName": "Gmail", "category": "Productivity", "usageTimeMinutes": 30 }
  ]
}
```

Upserts on `(userId, date)` — safe to call repeatedly.

**GET** `/api/sync/usage?userId=UUID&days=7` — returns last N days of stats.

---

### `POST /api/sync/profile`

```json
{
  "userId":       "uuid",
  "level":        12,
  "monthlyScore": 7.4,
  "isLoggedIn":   true
}
```

**GET** `/api/sync/profile?userId=UUID` — returns full profile.

---

## Android App Configuration

Set your base URL in the Android app to your Vercel deployment URL:

```
https://life-growth-web.vercel.app
```

All four endpoints are ready at the paths the app already expects.

---

## Security Notes

- Passwords are **never stored in plain text**. The SHA-256 hash is computed client-side (Android + browser) before ever leaving the device.
- The server uses **constant-time comparison** (`crypto.timingSafeEqual`) to prevent timing attacks.
- Usernames are **lowercased** on both registration and login to prevent case-collision attacks.
- The `passwordHash` column is `CHAR(64)` — any non-hex or wrong-length value is rejected at the API layer before hitting the database.

---

## Database Schema (v6)

| Table | Key columns |
|---|---|
| `user_profile` | `user_id UUID PK`, `username UNIQUE`, `password_hash CHAR(64)`, `level`, `monthly_score`, `is_logged_in` |
| `usage_stats` | `user_id FK`, `stat_date`, `screen_time_minutes`, `unlock_count`, `idle_worth_score`, `ai_insight` · UNIQUE `(user_id, stat_date)` |
| `app_usage` | `user_id FK`, `stat_date`, `app_name`, `category`, `usage_time_minutes` · UNIQUE `(user_id, stat_date, app_name)` |
