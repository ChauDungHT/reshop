-- Migration: Add coupons, user_coupons, and update sub_orders with coupon_id
-- Created At: 2026-06-18

-- Drop types/tables if they exist to allow safe re-run
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupontype') THEN
    CREATE TYPE CouponType AS ENUM ('percentage', 'fixed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,                 -- e.g. YONEX20
    name            VARCHAR(150) NOT NULL,                -- e.g. "Giảm 20% cho vợt Yonex"
    type            CouponType NOT NULL,                  -- 'percentage' | 'fixed'
    value           DECIMAL(15,2) NOT NULL,               -- 20 (%) or 50000 (VNĐ)
    min_order_value DECIMAL(15,2) DEFAULT 0,              -- minimum order value for this vendor
    max_discount    DECIMAL(15,2) DEFAULT NULL,           -- maximum discount ceiling (for percentage)
    total_quantity  INT DEFAULT NULL,                     -- NULL = unlimited
    per_user_limit  INT DEFAULT 1,                        -- max usages per customer
    starts_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',         -- 'active' | 'inactive'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_vendor_coupon_code UNIQUE (vendor_id, code)
);

CREATE TABLE IF NOT EXISTS user_coupons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

ALTER TABLE sub_orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_vendor_id ON coupons(vendor_id);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON coupons(starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_coupon_id ON sub_orders(coupon_id);
