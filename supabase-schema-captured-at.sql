-- Migration: Add captured_at column for sorting by photo capture time
-- Run this in your Supabase SQL Editor

-- Add the column
ALTER TABLE images ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE;

-- Index for fast sorting
CREATE INDEX IF NOT EXISTS idx_images_captured_at ON images(captured_at DESC NULLS LAST);
