-- Add mode column to messages table for tracking voice vs text messages
ALTER TABLE messages ADD COLUMN mode text DEFAULT 'text' CHECK (mode IN ('text', 'voice'));

-- Create index on mode for analytics queries
CREATE INDEX idx_messages_mode ON messages(mode);

-- Create index on session_id and mode for voice-specific analytics
CREATE INDEX idx_messages_session_mode ON messages(session_id, mode);
