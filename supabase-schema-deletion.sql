-- Supabase Schema for Image Deletion Functionality
-- This file contains RPC functions for managing S3 image deletion
-- Run this in Supabase SQL Editor to set up the deletion infrastructure

-- ============================================
-- Function 1: Get Deletion Statistics
-- Returns counts of images by various deletion categories
-- ============================================
CREATE OR REPLACE FUNCTION get_deletion_stats()
RETURNS TABLE(
  all_images BIGINT,
  trained_images BIGINT,
  untrained_images BIGINT,
  faulty_images BIGINT,
  pass_images BIGINT,
  maybe_images BIGINT,
  unlabeled_images BIGINT,
  with_s3_key BIGINT,
  without_s3_key BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as all_images,
    COUNT(*) FILTER (WHERE is_trained = true)::BIGINT as trained_images,
    COUNT(*) FILTER (WHERE is_trained = false)::BIGINT as untrained_images,
    COUNT(*) FILTER (WHERE label = 'faulty')::BIGINT as faulty_images,
    COUNT(*) FILTER (WHERE label = 'pass')::BIGINT as pass_images,
    COUNT(*) FILTER (WHERE label = 'maybe')::BIGINT as maybe_images,
    COUNT(*) FILTER (WHERE label = 'unlabeled')::BIGINT as unlabeled_images,
    COUNT(*) FILTER (WHERE s3_key IS NOT NULL)::BIGINT as with_s3_key,
    COUNT(*) FILTER (WHERE s3_key IS NULL)::BIGINT as without_s3_key
  FROM images;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function 2: Soft Delete Images by Filter
-- Sets s3_key to NULL (keeps database records for statistics)
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_images_by_filter(
  p_filter_type TEXT,
  p_filter_value TEXT DEFAULT NULL
)
RETURNS TABLE(updated_count BIGINT) AS $$
DECLARE
  v_updated BIGINT;
BEGIN
  CASE p_filter_type
    WHEN 'all' THEN
      UPDATE images SET s3_key = NULL WHERE s3_key IS NOT NULL;
    WHEN 'trained' THEN
      UPDATE images SET s3_key = NULL WHERE is_trained = true AND s3_key IS NOT NULL;
    WHEN 'untrained' THEN
      UPDATE images SET s3_key = NULL WHERE is_trained = false AND s3_key IS NOT NULL;
    WHEN 'faulty' THEN
      UPDATE images SET s3_key = NULL WHERE label = 'faulty' AND s3_key IS NOT NULL;
    WHEN 'pass' THEN
      UPDATE images SET s3_key = NULL WHERE label = 'pass' AND s3_key IS NOT NULL;
    WHEN 'maybe' THEN
      UPDATE images SET s3_key = NULL WHERE label = 'maybe' AND s3_key IS NOT NULL;
    WHEN 'unlabeled' THEN
      UPDATE images SET s3_key = NULL WHERE label = 'unlabeled' AND s3_key IS NOT NULL;
    ELSE
      RAISE EXCEPTION 'Invalid filter_type: %. Must be one of: all, trained, untrained, faulty, pass, maybe, unlabeled', p_filter_type;
  END CASE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN QUERY SELECT v_updated::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function 3: Hard Delete Images by Filter
-- Permanently removes database records
-- ============================================
CREATE OR REPLACE FUNCTION hard_delete_images_by_filter(
  p_filter_type TEXT,
  p_filter_value TEXT DEFAULT NULL
)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  CASE p_filter_type
    WHEN 'all' THEN
      DELETE FROM images WHERE s3_key IS NOT NULL;
    WHEN 'trained' THEN
      DELETE FROM images WHERE is_trained = true AND s3_key IS NOT NULL;
    WHEN 'untrained' THEN
      DELETE FROM images WHERE is_trained = false AND s3_key IS NOT NULL;
    WHEN 'faulty' THEN
      DELETE FROM images WHERE label = 'faulty' AND s3_key IS NOT NULL;
    WHEN 'pass' THEN
      DELETE FROM images WHERE label = 'pass' AND s3_key IS NOT NULL;
    WHEN 'maybe' THEN
      DELETE FROM images WHERE label = 'maybe' AND s3_key IS NOT NULL;
    WHEN 'unlabeled' THEN
      DELETE FROM images WHERE label = 'unlabeled' AND s3_key IS NOT NULL;
    ELSE
      RAISE EXCEPTION 'Invalid filter_type: %. Must be one of: all, trained, untrained, faulty, pass, maybe, unlabeled', p_filter_type;
  END CASE;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT v_deleted::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function 4: Get S3 Keys by Filter
-- Returns S3 keys matching the specified filter with pagination
-- ============================================
CREATE OR REPLACE FUNCTION get_s3_keys_by_filter(
  p_filter_type TEXT,
  p_filter_value TEXT DEFAULT NULL,
  p_batch_size INTEGER DEFAULT 500,
  p_batch_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  s3_key TEXT,
  filename TEXT,
  id UUID
) AS $$
BEGIN
  CASE p_filter_type
    WHEN 'all' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'trained' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE is_trained = true AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'untrained' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE is_trained = false AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'faulty' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE label = 'faulty' AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'pass' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE label = 'pass' AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'maybe' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE label = 'maybe' AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    WHEN 'unlabeled' THEN
      RETURN QUERY
      SELECT s3_key, filename, id
      FROM images
      WHERE label = 'unlabeled' AND s3_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size OFFSET p_batch_offset;
    ELSE
      RAISE EXCEPTION 'Invalid filter_type: %. Must be one of: all, trained, untrained, faulty, pass, maybe, unlabeled', p_filter_type;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Test Queries (uncomment to test functions)
-- ============================================

-- Test get_deletion_stats()
-- SELECT * FROM get_deletion_stats();

-- Test soft_delete_images_by_filter() - won't actually delete, just shows count
-- SELECT * FROM soft_delete_images_by_filter('trained');

-- Test get_s3_keys_by_filter() - get first 10 trained images
-- SELECT * FROM get_s3_keys_by_filter('trained', NULL, 10, 0);

-- Note: Be careful with hard_delete_images_by_filter() as it permanently deletes records!
-- SELECT * FROM hard_delete_images_by_filter('trained');
