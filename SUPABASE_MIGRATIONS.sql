-- Create widget_settings table
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  avatar_url TEXT,
  greeting_message TEXT DEFAULT 'Hello! How can I help you today?',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left', 'middle-left', 'middle-right', 'top-left', 'top-right')),
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  primary_color TEXT DEFAULT '#2563eb',
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(website_id)
);

-- Create page_crawl_metadata table
CREATE TABLE IF NOT EXISTS page_crawl_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  is_deleted INTEGER DEFAULT 0,
  last_recrawl_at TIMESTAMP,
  crawl_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(page_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_settings_website_id ON widget_settings(website_id);
CREATE INDEX IF NOT EXISTS idx_page_crawl_metadata_page_id ON page_crawl_metadata(page_id);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_crawl_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow public access for now, restrict as needed)
CREATE POLICY "Allow public read on widget_settings" ON widget_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert on widget_settings" ON widget_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on widget_settings" ON widget_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on widget_settings" ON widget_settings FOR DELETE USING (true);

CREATE POLICY "Allow public read on page_crawl_metadata" ON page_crawl_metadata FOR SELECT USING (true);
CREATE POLICY "Allow public insert on page_crawl_metadata" ON page_crawl_metadata FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on page_crawl_metadata" ON page_crawl_metadata FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on page_crawl_metadata" ON page_crawl_metadata FOR DELETE USING (true);
