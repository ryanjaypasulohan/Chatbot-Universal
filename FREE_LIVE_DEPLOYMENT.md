# Wild Script — Go Live for $0 (Free Tier Guide)

Deploy the full platform (dashboard, API, chat widget) using **only free services**.

| Service | Role | Free tier |
| ------- | ---- | --------- |
| [Supabase](https://supabase.com) | Database, Auth, vectors | Yes |
| [Groq](https://console.groq.com) | AI chat responses | Yes (rate limits) |
| [Render](https://render.com) | Host Node.js app | Yes (sleeps after 15 min idle) |
| [GitHub](https://github.com) | Code hosting | Yes |

**Total cost: $0/month** if you stay within free limits.

---

## Architecture (production)

```
Visitor website  →  embed.js  →  YOUR_APP.onrender.com/api/chat
You (browser)    →  YOUR_APP.onrender.com/dashboard.html
Supabase Cloud   →  Postgres + Auth (separate, always on)
Groq API         →  LLM answers
```

One Render web service runs `apps/api` and serves the dashboard static files.

---

## Part A — One-time local prep (30–45 min)

### Step 1: Push code to GitHub

1. Create a repo on GitHub (e.g. `wildscript-chatbot`).
2. From your project folder:

```bash
git init
git add .
git commit -m "Prepare Wild Script for production"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Do **not** commit `.env` (secrets).

---

### Step 2: Supabase project (database + auth)

1. Go to [supabase.com](https://supabase.com) → **New project** (free).
2. Save the database password.
3. Wait until the project is **Active**.

**Run SQL (SQL Editor → New query):**

1. `SUPABASE_SCHEMA_SYNC_MIGRATION.sql` (from this repo)
2. Assign chatbots (Step 4) with your Auth User UID if needed

**Get API keys:** Project Settings → **API**

| Key | Use |
| --- | --- |
| Project URL | `SUPABASE_URL` |
| `anon` `public` | `SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` (server only) |

**Auth URLs (Authentication → URL configuration):**

| Field | Value |
| ----- | ----- |
| Site URL | `https://YOUR_APP.onrender.com` (update after Render deploy) |
| Redirect URLs | `https://YOUR_APP.onrender.com/dashboard.html` |
| | `https://YOUR_APP.onrender.com/login.html` |
| | `http://localhost:3000/dashboard.html` (local dev) |

Enable **Email** provider (Authentication → Providers). Add **Google** only if you need it (same redirect URLs).

---

### Step 3: Groq API key (free LLM)

1. [console.groq.com](https://console.groq.com) → sign up.
2. **API Keys** → Create key.
3. Copy → `GROQ_API_KEY`.

---

### Step 4: Test locally

```bash
cp .env.example .env
# Fill SUPABASE_* and GROQ_API_KEY in .env

pnpm install
pnpm dev
```

Open `http://localhost:3000` → login → create chatbot → crawl → copy embed script.

---

## Part B — Deploy to Render (free hosting)

### Step 5: Create Render web service

1. [dashboard.render.com](https://dashboard.render.com) → sign up (GitHub login).
2. **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Settings:

| Setting | Value |
| ------- | ----- |
| Name | `wildscript` (or any name) |
| Region | Closest to you |
| Branch | `main` |
| Runtime | **Node** |
| Build Command | `corepack enable && pnpm install --prod=false && pnpm run build` |
| Start Command | `pnpm run start` |
| Plan | **Free** |

Or use **Blueprint**: New → **Blueprint** → point at repo with `render.yaml`.

---

### Step 6: Environment variables on Render

In the service → **Environment**:

| Key | Value |
| --- | ----- |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | From Supabase |
| `SUPABASE_ANON_KEY` | From Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase |
| `GROQ_API_KEY` | From Groq |
| `PUBLIC_APP_URL` | `https://wildscript-xxxx.onrender.com` (your Render URL) |
| `ALLOWED_ORIGIN` | Same as `PUBLIC_APP_URL` |

Click **Save** → **Manual Deploy** (or wait for auto deploy).

First deploy may take **5–10 minutes** (installs dependencies + builds TypeScript + downloads embedding model on first use).

---

### Step 7: Update Supabase redirect URLs

Use your real Render URL:

- Site URL: `https://wildscript-xxxx.onrender.com`
- Redirect URLs:  
  `https://wildscript-xxxx.onrender.com/dashboard.html`  
  `https://wildscript-xxxx.onrender.com/login.html`

---

### Step 8: Verify production

| Check | URL |
| ----- | --- |
| Health | `https://YOUR_APP.onrender.com/api/health` → `{"ok":true}` |
| Login | `https://YOUR_APP.onrender.com/login.html` |
| Dashboard | `https://YOUR_APP.onrender.com/dashboard.html` |
| Config | `https://YOUR_APP.onrender.com/config.js` (should set `SUPABASE_URL`) |

**Smoke test**

1. Register / sign in.
2. Create chatbot → appears in list.
3. Crawl a small site.
4. Copy embed script; `apiUrl` must be `https://YOUR_APP.onrender.com/api/chat`.
5. Paste embed on a test HTML page; send a chat message.

---

## Part C — Embed on your live website

```html
<!-- Before </body> -->
<script>
window.AI_CHATBOT_WIDGET_CONFIG = {
  websiteId: 'YOUR_CHATBOT_UUID',
  apiUrl: 'https://YOUR_APP.onrender.com/api/chat'
};
</script>
<script type="module" src="https://YOUR_APP.onrender.com/widget/embed.js"></script>
```

Replace `YOUR_CHATBOT_UUID` from the dashboard.

---

## Free tier limits (know before launch)

### Render (free)

- Service **sleeps after ~15 minutes** with no traffic.
- First request after sleep: **30–60+ seconds** (cold start).
- 750 hours/month shared across free services.
- **Tip:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/api/health` every 14 min if you want fewer cold starts (optional).

### Supabase (free)

- 500 MB database, 50k monthly active users (Auth).
- Project **pauses** after 1 week inactive (dashboard warns you).
- Enable pgvector if `match_embeddings` fails (Database → Extensions → `vector`).

### Groq (free)

- Rate limits; may throttle under heavy use.
- Monitor usage in Groq console.

### Embeddings (on-server)

- First crawl/chat downloads a small ML model (~80MB); needs **512MB+ RAM**.
- Render free = 512MB — usually OK; if OOM, upgrade plan or use smaller crawl batches.

---

## Optional: custom domain (still $0 on Render*)

1. Render → your service → **Settings** → **Custom Domains**.
2. Add domain; follow DNS instructions (CNAME).
3. Update `PUBLIC_APP_URL`, `ALLOWED_ORIGIN`, and Supabase redirect URLs to `https://yourdomain.com`.

\* Render free supports custom domains; SSL is included.

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Build fails on Render | Use build command with `pnpm install --prod=false` (installs TypeScript). Fix tsconfig if you see TS5101/TS5107 errors. |
| 502 / timeout on first visit | Cold start; wait 60s and retry. |
| Login loop | Supabase redirect URLs must match Render URL exactly. |
| Chatbots empty | Run `SUPABASE_SCHEMA_SYNC_MIGRATION.sql` + assign `user_id` on websites. |
| Profile error | Use `users` table migration; do not use `profiles`. |
| Chat returns error | Check `GROQ_API_KEY`; check Render logs. |
| Crawl fails | Target site may block bots; try another URL. |
| `match_embeddings` error | Enable `vector` extension + run Step 6 in migration SQL. |

**Logs:** Render → service → **Logs** (runtime errors appear here).

---

## Security checklist (production)

- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- [ ] `.env` is in `.gitignore` and not pushed.
- [ ] `ALLOWED_ORIGIN` set to your real app URL only.
- [ ] Supabase RLS reviewed if you add direct client DB access later.
- [ ] Rotate keys if they were ever committed.

---

## Quick reference — commands

```bash
# Local development
pnpm install
pnpm dev

# Production build (same as Render)
pnpm run build
pnpm run start
```

---

## What we ship in this repo for deploy

| File | Purpose |
| ---- | ------- |
| `render.yaml` | One-click Render blueprint |
| `.env.example` | Template for secrets |
| `package.json` | `pnpm run build` / `pnpm run start` for production |
| `FREE_LIVE_DEPLOYMENT.md` | This guide |

You are live when health check passes, dashboard loads, and the widget answers on a real page.
