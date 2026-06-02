-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  plan text NOT NULL DEFAULT 'free'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.websites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  api_key text NOT NULL DEFAULT ('cw_'::text || replace((gen_random_uuid())::text, '-'::text, ''::text)) UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text,
  widget_color text NOT NULL DEFAULT '#00D4AA'::text,
  widget_name text NOT NULL DEFAULT 'AI Assistant'::text,
  widget_greeting text NOT NULL DEFAULT 'Hi! How can I help you today?'::text,
  widget_position text NOT NULL DEFAULT 'bottom-right'::text,
  last_crawled_at timestamp with time zone,
  pages_indexed integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT websites_pkey PRIMARY KEY (id),
  CONSTRAINT websites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.website_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  url text NOT NULL,
  title text,
  content text,
  crawled_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT website_pages_pkey PRIMARY KEY (id),
  CONSTRAINT website_pages_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  page_id uuid NOT NULL,
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT embeddings_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id),
  CONSTRAINT embeddings_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.website_pages(id)
);
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  visitor_id text NOT NULL,
  language text DEFAULT 'en'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_msg_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  website_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id),
  CONSTRAINT messages_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  session_id uuid,
  name text,
  email text,
  phone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id),
  CONSTRAINT leads_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message_count integer NOT NULL DEFAULT 1,
  tokens_used integer DEFAULT 0,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT usage_logs_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id),
  CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.widget_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL UNIQUE,
  avatar_url text,
  greeting_message text DEFAULT 'Hello! How can I help you today?'::text,
  position text DEFAULT 'bottom-right'::text CHECK ("position" = ANY (ARRAY['bottom-right'::text, 'bottom-left'::text, 'middle-left'::text, 'middle-right'::text, 'top-left'::text, 'top-right'::text])),
  theme text DEFAULT 'light'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text])),
  primary_color text DEFAULT '#2563eb'::text,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT widget_settings_pkey PRIMARY KEY (id),
  CONSTRAINT widget_settings_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.page_crawl_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL UNIQUE,
  is_deleted integer DEFAULT 0,
  last_recrawl_at timestamp without time zone,
  crawl_count integer DEFAULT 1,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT page_crawl_metadata_pkey PRIMARY KEY (id),
  CONSTRAINT page_crawl_metadata_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.website_pages(id)
);