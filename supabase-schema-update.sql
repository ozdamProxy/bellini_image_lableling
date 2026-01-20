-- Multi-User Labeling System - Update Schema
-- Run this in your Supabase SQL Editor to add user claiming functionality

-- Add new columns to images table for claiming/locking
ALTER TABLE images
ADD COLUMN IF NOT EXISTS claimed_by TEXT,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for claim queries
CREATE INDEX IF NOT EXISTS idx_images_claimed_by ON images(claimed_by);
CREATE INDEX IF NOT EXISTS idx_images_claim_expires ON images(claim_expires_at);

-- Function to auto-release expired claims
CREATE OR REPLACE FUNCTION release_expired_claims()
RETURNS void AS $$
BEGIN
  UPDATE images
  SET claimed_by = NULL,
      claimed_at = NULL,
      claim_expires_at = NULL
  WHERE claim_expires_at IS NOT NULL
    AND claim_expires_at < NOW()
    AND label = 'unlabeled';
END;
$$ LANGUAGE plpgsql;

-- Function to claim next available image for a user
CREATE OR REPLACE FUNCTION claim_next_image(
  p_user_id TEXT,
  p_claim_duration_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  filename TEXT,
  s3_key TEXT,
  s3_bucket TEXT,
  label TEXT,
  path TEXT
) AS $$
DECLARE
  v_image RECORD;
BEGIN
  -- First, release any expired claims
  PERFORM release_expired_claims();

  -- Find and claim the next available unlabeled image
  SELECT i.id, i.filename, i.s3_key, i.s3_bucket, i.label
  INTO v_image
  FROM images i
  WHERE i.label = 'unlabeled'
    AND (i.claimed_by IS NULL OR i.claim_expires_at < NOW())
  ORDER BY i.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If we found an image, claim it
  IF FOUND THEN
    UPDATE images
    SET claimed_by = p_user_id,
        claimed_at = NOW(),
        claim_expires_at = NOW() + (p_claim_duration_minutes || ' minutes')::INTERVAL
    WHERE images.id = v_image.id;

    -- Return the claimed image
    RETURN QUERY
    SELECT
      v_image.id,
      v_image.filename,
      v_image.s3_key,
      v_image.s3_bucket,
      v_image.label,
      '' as path;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's claimed images
CREATE OR REPLACE FUNCTION get_user_claimed_images(p_user_id TEXT)
RETURNS TABLE(
  id UUID,
  filename TEXT,
  s3_key TEXT,
  s3_bucket TEXT,
  label TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  claim_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.filename,
    i.s3_key,
    i.s3_bucket,
    i.label,
    i.claimed_at,
    i.claim_expires_at
  FROM images i
  WHERE i.claimed_by = p_user_id
    AND i.label = 'unlabeled'
    AND i.claim_expires_at > NOW()
  ORDER BY i.claimed_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to release a claim
CREATE OR REPLACE FUNCTION release_claim(
  p_user_id TEXT,
  p_filename TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE images
  SET claimed_by = NULL,
      claimed_at = NULL,
      claim_expires_at = NULL
  WHERE filename = p_filename
    AND claimed_by = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to extend claim
CREATE OR REPLACE FUNCTION extend_claim(
  p_user_id TEXT,
  p_filename TEXT,
  p_additional_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE images
  SET claim_expires_at = claim_expires_at + (p_additional_minutes || ' minutes')::INTERVAL
  WHERE filename = p_filename
    AND claimed_by = p_user_id
    AND claim_expires_at > NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Update the stats view to include claim information
DROP VIEW IF EXISTS image_stats;
CREATE OR REPLACE VIEW image_stats AS
SELECT
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE label = 'unlabeled' AND (claimed_by IS NULL OR claim_expires_at < NOW())) as available_unlabeled_count,
  COUNT(*) FILTER (WHERE label = 'unlabeled' AND claimed_by IS NOT NULL AND claim_expires_at > NOW()) as claimed_count,
  COUNT(*) FILTER (WHERE label = 'unlabeled') as unlabeled_count,
  COUNT(*) FILTER (WHERE label = 'pass') as pass_count,
  COUNT(*) FILTER (WHERE label = 'faulty') as faulty_count,
  COUNT(*) FILTER (WHERE label = 'maybe') as maybe_count,
  COUNT(*) FILTER (WHERE is_trained = true) as trained_count,
  COUNT(*) FILTER (WHERE label != 'unlabeled' AND is_trained = false) as labeled_untrained_count,
  COUNT(DISTINCT claimed_by) FILTER (WHERE claimed_by IS NOT NULL AND claim_expires_at > NOW()) as active_labelers_count
FROM images;
