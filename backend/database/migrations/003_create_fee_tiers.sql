-- ============================================================
-- Migration 003: Create fee_tiers and fee_tier_items tables
-- ============================================================

BEGIN;

-- 1. Create fee_tiers table
CREATE TABLE IF NOT EXISTS fee_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create fee_tier_items table
CREATE TABLE IF NOT EXISTS fee_tier_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_tier_id UUID NOT NULL REFERENCES fee_tiers(id) ON DELETE CASCADE,
  fee_name VARCHAR(100) NOT NULL,
  fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'fixed')),
  fee_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fee_tier_items_tier_name_unique UNIQUE (fee_tier_id, fee_name)
);

-- 3. Add fee_tier_id column to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS fee_tier_id UUID REFERENCES fee_tiers(id) ON DELETE SET NULL;

COMMIT;
