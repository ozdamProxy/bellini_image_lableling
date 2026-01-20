-- Supabase Database Schema for Image Labeling App
-- Run this in your Supabase SQL Editor

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  s3_key TEXT NOT NULL,
  s3_bucket TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'unlabeled' CHECK (label IN ('pass', 'faulty', 'maybe', 'unlabeled')),
  is_trained BOOLEAN DEFAULT FALSE,
  trained_at TIMESTAMP WITH TIME ZONE,
  labeled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_images_label ON images(label);
CREATE INDEX IF NOT EXISTS idx_images_is_trained ON images(is_trained);
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations" ON images
FOR ALL
USING (true)
WITH CHECK (true);

-- Optional: Create a view for statistics
CREATE OR REPLACE VIEW image_stats AS
SELECT
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE label = 'unlabeled') as unlabeled_count,
  COUNT(*) FILTER (WHERE label = 'pass') as pass_count,
  COUNT(*) FILTER (WHERE label = 'faulty') as faulty_count,
  COUNT(*) FILTER (WHERE label = 'maybe') as maybe_count,
  COUNT(*) FILTER (WHERE is_trained = true) as trained_count,
  COUNT(*) FILTER (WHERE label != 'unlabeled' AND is_trained = false) as labeled_untrained_count
FROM images;
