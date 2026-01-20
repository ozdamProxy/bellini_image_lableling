-- Add user_name tracking to images table
-- This allows the admin dashboard to show actual names instead of user IDs

-- Add user_name column to track the labeler's name
ALTER TABLE images
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create an index for faster lookups by user_name
CREATE INDEX IF NOT EXISTS idx_images_user_name ON images(user_name);

-- Create a users table to map user IDs to names
CREATE TABLE IF NOT EXISTS labelers (
  user_id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_labelers_user_name ON labelers(user_name);

-- Function to update or insert labeler info
CREATE OR REPLACE FUNCTION upsert_labeler(
  p_user_id TEXT,
  p_user_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO labelers (user_id, user_name, last_seen_at)
  VALUES (p_user_id, p_user_name, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    user_name = EXCLUDED.user_name,
    last_seen_at = NOW();
END;
$$;
