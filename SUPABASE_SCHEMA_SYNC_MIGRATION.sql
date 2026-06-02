-- =============================================================================
-- Wild Script — Schema sync migration
-- Source of truth: aiuniversalchatbot.sql
-- Run this entire script in the Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Extend public.users for profile fields (app uses users, NOT profiles)
-- Fixes: "Could not find the table public.profiles"
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.users.avatar_url IS 'Profile avatar URL (dashboard Account settings)';

-- -----------------------------------------------------------------------------
-- STEP 2: Sync Supabase Auth accounts into public.users
-- Fixes: websites.user_id FK → public.users(id) mismatch with auth.users.id
-- Every logged-in user must exist in public.users with the SAME id as auth.users.
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, email, name)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    split_part(au.email, '@', 1)
  )
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  name = COALESCE(public.users.name, EXCLUDED.name);

-- -----------------------------------------------------------------------------
-- STEP 3: Ensure websites.settings exists (AI config + archive flag)
-- -----------------------------------------------------------------------------
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- STEP 4: Backfill chatbot ownership (CRITICAL for empty dashboard lists)
-- Replace YOUR_AUTH_USER_ID with your UUID from:
--   Supabase Dashboard → Authentication → Users → copy User UID
-- -----------------------------------------------------------------------------
-- Example (uncomment and edit):
-- UPDATE public.websites
-- SET user_id = '00000000-0000-0000-0000-000000000000'
-- WHERE user_id IS NULL;

-- Optional: assign ALL unowned chatbots to one user (single-tenant / dev only)
-- UPDATE public.websites SET user_id = 'YOUR_AUTH_USER_ID' WHERE user_id IS NULL;

-- -----------------------------------------------------------------------------
-- STEP 5: Indexes for performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON public.websites(user_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_website_id ON public.website_pages(website_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_page_id ON public.embeddings(page_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_website_id ON public.chat_sessions(website_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);

-- -----------------------------------------------------------------------------
-- STEP 6: match_embeddings RPC (vector search for chat)
-- Only run if you use pgvector and do not already have this function.
-- Adjust vector dimension (1536) to match your embedding model if different.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- If embeddings.embedding column type differs, this may need adjustment.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'match_embeddings'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.match_embeddings(
        query_embedding vector(384),
        match_threshold float,
        match_count int,
        filter_website_id uuid
      )
      RETURNS TABLE (
        id uuid,
        page_id uuid,
        content text,
        similarity float
      )
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT
          e.id,
          e.page_id,
          e.content,
          1 - (e.embedding <=> query_embedding) AS similarity
        FROM public.embeddings e
        INNER JOIN public.website_pages p ON p.id = e.page_id
        WHERE p.website_id = filter_website_id
          AND e.embedding IS NOT NULL
          AND 1 - (e.embedding <=> query_embedding) > match_threshold
        ORDER BY e.embedding <=> query_embedding
        LIMIT match_count;
      $body$;
    $fn$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 7: Verify (read-only checks — review output in SQL editor)
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS auth_users FROM auth.users;
-- SELECT COUNT(*) AS app_users FROM public.users;
-- SELECT COUNT(*) AS total_websites FROM public.websites;
-- SELECT COUNT(*) AS unowned_websites FROM public.websites WHERE user_id IS NULL;
-- SELECT id, domain, user_id FROM public.websites ORDER BY created_at DESC LIMIT 20;
