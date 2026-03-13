-- Supabase Schema for Factory Reset / Hard Reset
-- This function completely wipes all images from the database
-- Run this in Supabase SQL Editor to set up the factory reset functionality

-- ============================================
-- Function: Delete All Images (Factory Reset)
-- Permanently removes ALL image records from the database
-- This is used for the Nuclear Option / Factory Reset
-- ============================================
CREATE OR REPLACE FUNCTION delete_all_images()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  -- Delete all records from the images table
  DELETE FROM images;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT v_deleted::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Test Query (uncomment to test the function)
-- WARNING: This will delete ALL data! Only use for testing!
-- ============================================
-- SELECT * FROM delete_all_images();
