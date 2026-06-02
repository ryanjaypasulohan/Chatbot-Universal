# Database Audit Report — Wild Script

**Source of truth:** `aiuniversalchatbot.sql` (exported Supabase schema)  
**Audited:** Application code in `apps/api`, `apps/dashboard`, `packages/embeddings`

---

## 1. Root Cause Analysis

### Why chatbots do not appear (Your Chatbots, Crawl dropdown, Analytics, Conversations)

| Layer | Finding |
| ----- | ------- |
| **Query** | `GET /api/websites` filters with `.eq('user_id', user.id)` where `user.id` comes from **Supabase Auth** (`auth.users`). |
| **Schema** | `websites.user_id` foreign key references **`public.users(id)`**, not `auth.users`. |
| **Data** | Chatbots created while logged in often have **`user_id = NULL`** or a value that does not match any `public.users` row, because no row was synced in `public.users` before insert/update. |
| **Result** | The API returns an **empty array** → dashboard dropdowns stay empty → crawl/analytics/conversations cannot select a chatbot. |

This is **not** a frontend bug. The list API intentionally scopes by owner, but ownership was never written correctly.

### Why the profile update fails

| Layer | Finding |
| ----- | ------- |
| **Query** | `PUT /api/me` used `public.profiles` with columns `display_name`, `avatar_url`, `updated_at`. |
| **Schema** | **`public.profiles` does not exist** in `aiuniversalchatbot.sql`. |
| **Correct table** | **`public.users`** with columns `id`, `email`, `name`, `created_at` (no `display_name`; use `name`). |
| **Error** | `Could not find the table 'public.profiles' in the schema cache` |

### Secondary issues (fixed in code)

| Issue | Impact |
| ----- | ------ |
| `widget_settings` insert/update used **camelCase** (`websiteId`, `avatarUrl`) | Inserts/updates failed or ignored columns |
| `profiles` referenced in `DELETE /api/me` | Account delete profile step failed |
| No `ensureAppUser()` on login/create | FK / ownership writes failed silently |

---

## 2. Database Comparison Report

Tables **in** `aiuniversalchatbot.sql` vs **expected by application**:

| Table | Exists in DB | Used by app | Missing columns (app expects) | Issues found |
| ----- | ------------ | ----------- | ------------------------------ | ------------ |
| **users** | Yes | Yes (after fix) | `avatar_url` (optional, added in migration) | App wrongly used `profiles` instead; auth id must match `users.id` |
| **profiles** | **No** | Was used | Entire table | **Table does not exist** — root cause of profile error |
| **websites** | Yes | Yes | `settings` jsonb (in schema) | `user_id` must equal auth user id via synced `public.users` row |
| **website_pages** | Yes | Yes | — | App used `created_at` for order; DB has `last_modified` (fixed in code) |
| **embeddings** | Yes | Yes | — | No `website_id` on table; RPC joins via `page_id` (correct) |
| **chat_sessions** | Yes | Yes | — | Aligned |
| **messages** | Yes | Yes | — | Aligned |
| **widget_settings** | Yes | Yes | — | App sent camelCase column names (fixed) |
| **leads** | Yes | No | — | Not used yet |
| **usage_logs** | Yes | No | — | Not used yet |
| **page_crawl_metadata** | Yes | No | — | Not used yet |
| **match_embeddings** (RPC) | Not in SQL export | Yes | — | May be missing in DB; migration includes optional create |

Tables **referenced by outdated docs** (`aiuniversalchatbot.md`) but **not** in `aiuniversalchatbot.sql`:

- `profiles` (old doc) — **do not create**; use `users` per current schema.

---

## 3. Failing queries (before fixes)

| Endpoint | Query | Failure |
| -------- | ----- | ------- |
| `GET /api/websites` | `websites` WHERE `user_id = auth.id` | Returns `[]` when `user_id` is null or not in `public.users` |
| `PUT /api/me` | `profiles` UPDATE/INSERT | Table not found |
| `GET /api/me` | `profiles` SELECT | Table not found (was non-fatal) |
| `PUT widget-settings` | `widget_settings` with camelCase keys | Column mismatch |
| `POST /api/websites` | INSERT `websites` with `user_id = auth.id` | FK violation if no `public.users` row |

---

## 4. Code fixes applied

| File | Change |
| ---- | ------ |
| `apps/api/src/index.ts` | `ensureAppUser()` syncs auth → `public.users` |
| | `GET/POST /api/websites` call `ensureAppUser` before reads/writes |
| | Profile routes use **`users`** (`name`, `avatar_url`) |
| | Widget settings use **snake_case** DB columns + camelCase API response |
| | Unowned chatbots claimed on first owned access; orphan hint when list empty |
| `apps/dashboard/public/dashboard.js` | Handles wrapped `{ websites, hint }` response; profile `name` fallback |

---

## 5. SQL migration

Run:** `SUPABASE_SCHEMA_SYNC_MIGRATION.sql`** in Supabase SQL Editor.

| Step | What it fixes |
| ---- | ------------- |
| 1 | Adds `users.avatar_url` |
| 2 | Syncs `auth.users` → `public.users` (same UUID) |
| 3 | Ensures `websites.settings` |
| 4 | **You** assign `user_id` on orphan chatbots (required if list still empty) |
| 5 | Indexes |
| 6 | Optional `match_embeddings` function |

---

## 6. Final verification checklist

After migration + API restart (`pnpm dev`):

- [ ] `SELECT id, email FROM public.users` shows your auth UUID  
- [ ] `SELECT id, domain, user_id FROM public.websites` shows your UUID in `user_id`  
- [ ] Dashboard → **Your Chatbots** lists domains  
- [ ] **Crawl Website** dropdown populated  
- [ ] **Analytics** / **Conversations** selectors populated  
- [ ] **Account** profile save succeeds (no `profiles` error)

---

## 7. Assign orphan chatbots (if still empty after Step 2)

In Supabase SQL Editor (replace with your Auth User UID):

```sql
UPDATE public.websites
SET user_id = 'YOUR_AUTH_USER_ID'
WHERE user_id IS NULL;
```

Then refresh the dashboard.
