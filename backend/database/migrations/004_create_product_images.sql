-- ============================================================
-- Migration 004: Create product_images table and add avatar_url
-- ============================================================

BEGIN;

-- 1. Ensure avatar_url column exists in users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- 2. Create product_images table if not exists
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create index if not exists
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

COMMIT;
