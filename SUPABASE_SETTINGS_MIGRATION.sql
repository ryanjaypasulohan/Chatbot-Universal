-- Optional: add settings JSON column for AI config & archive state
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
