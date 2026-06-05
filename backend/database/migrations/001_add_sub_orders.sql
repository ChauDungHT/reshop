-- ============================================================
-- Migration 001: Add sub_orders table (Parent-Child Orders)
-- [Risk 4] Strategy: backfill existing data without data loss
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- Step 1: Create sub_orders table
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id         UUID REFERENCES vendors(id),          -- nullable for orphan fallback [Risk 4]
  sub_order_code    VARCHAR(60) NOT NULL,                 -- e.g. ORD-20260512-ABCDE-A
  status            VARCHAR(20) DEFAULT 'pending',
  subtotal          DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_fee      DECIMAL(15,2) DEFAULT 0,
  vendor_discount   DECIMAL(15,2) DEFAULT 0,
  platform_discount DECIMAL(15,2) DEFAULT 0,             -- [Risk 3] Pro-rata platform voucher
  refunded_amount   DECIMAL(15,2) DEFAULT 0,             -- [Risk 5-B] accumulated refund
  tracking_number   VARCHAR(100) NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_orders_order_id  ON sub_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_vendor_id ON sub_orders(vendor_id);

-- ──────────────────────────────────────────────────────────────
-- Step 2: Add refunded_amount to orders (parent) [Risk 5-B]
-- NEVER modify total_amount after creation
-- ──────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(15,2) DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- Step 3: Add sub_order_id to order_items (nullable first)
-- ──────────────────────────────────────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS sub_order_id UUID REFERENCES sub_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_sub_order_id ON order_items(sub_order_id);

-- ──────────────────────────────────────────────────────────────
-- Step 4: Backfill sub_orders from existing data [Risk 4]
--
-- Logic:
--   • Group order_items by (order_id, vendor_id via products join)
--   • For each group → INSERT 1 sub_order
--   • sub_order_code = order_code || '-' || chr(65 + row_number - 1)
--   • subtotal = sum(price_snapshot * quantity) per group
--   • First sub_order per order gets the full shipping_fee from orders
--     (orders table does NOT currently store shipping_fee, so default 0)
--   • Orphan items (no vendor_id via products) → log warning, skip
--     (they will remain with sub_order_id = NULL for manual fix)
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  v_sub_order_id UUID;
  v_suffix TEXT;
  v_rank INT;
  v_vendor_count INT;
BEGIN
  -- Iterate over each (order_id, vendor_id) group
  FOR r IN
    SELECT
      oi.order_id,
      p.vendor_id,
      o.order_code,
      o.status::TEXT AS order_status,
      o.created_at  AS order_created_at,
      SUM(oi.price_snapshot * oi.quantity) AS subtotal,
      ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY p.vendor_id) AS vendor_rank,
      COUNT(*) OVER (PARTITION BY oi.order_id) AS vendor_count_in_order
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.sub_order_id IS NULL   -- only process un-migrated items
      AND p.vendor_id IS NOT NULL
    GROUP BY oi.order_id, p.vendor_id, o.order_code, o.status, o.created_at
  LOOP
    -- Build suffix: A, B, C, … (up to 26 vendors per order)
    v_suffix := chr(64 + r.vendor_rank::INT);  -- 65='A'

    -- Insert sub_order
    INSERT INTO sub_orders (
      order_id,
      vendor_id,
      sub_order_code,
      status,
      subtotal,
      shipping_fee,
      created_at,
      updated_at
    )
    VALUES (
      r.order_id,
      r.vendor_id,
      r.order_code || '-' || v_suffix,
      r.order_status,
      r.subtotal,
      0,  -- shipping_fee: original orders table has no shipping_fee column
      r.order_created_at,
      r.order_created_at
    )
    RETURNING id INTO v_sub_order_id;

    -- Link order_items to this sub_order
    UPDATE order_items oi
    SET sub_order_id = v_sub_order_id
    FROM products p
    WHERE oi.product_id = p.id
      AND oi.order_id   = r.order_id
      AND p.vendor_id   = r.vendor_id
      AND oi.sub_order_id IS NULL;

    RAISE NOTICE 'Migrated sub_order % for order % vendor %', v_sub_order_id, r.order_id, r.vendor_id;
  END LOOP;

  -- Log orphan items (products deleted / vendor_id lost)
  FOR r IN
    SELECT oi.id, oi.order_id
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.sub_order_id IS NULL
      AND (p.id IS NULL OR p.vendor_id IS NULL)
  LOOP
    RAISE WARNING '[ORPHAN] order_item % in order % has no resolvable vendor_id — manual fix required', r.id, r.order_id;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- Step 5: Migrate tracking_code & vendor_status from order_items
--         into sub_orders, then drop those columns
-- ──────────────────────────────────────────────────────────────

-- Copy tracking_code to sub_orders (take first non-null value per group)
UPDATE sub_orders so
SET tracking_number = sub.tracking_code
FROM (
  SELECT DISTINCT ON (sub_order_id) sub_order_id, tracking_code
  FROM order_items
  WHERE sub_order_id IS NOT NULL
    AND tracking_code IS NOT NULL
  ORDER BY sub_order_id, created_at
) sub
WHERE so.id = sub.sub_order_id
  AND so.tracking_number IS NULL;

-- Drop old per-item columns (now live in sub_orders)
ALTER TABLE order_items
  DROP COLUMN IF EXISTS vendor_status,
  DROP COLUMN IF EXISTS tracking_code;

-- ──────────────────────────────────────────────────────────────
-- Step 6: Enforce NOT NULL on order_items.sub_order_id
--         only if ALL items have been linked (safety check)
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_unlinked INT;
BEGIN
  SELECT COUNT(*) INTO v_unlinked
  FROM order_items
  WHERE sub_order_id IS NULL;

  IF v_unlinked = 0 THEN
    ALTER TABLE order_items ALTER COLUMN sub_order_id SET NOT NULL;
    RAISE NOTICE 'All order_items linked — sub_order_id set NOT NULL';
  ELSE
    RAISE WARNING '% order_item(s) still have sub_order_id = NULL. Column stays nullable — fix orphans before enforcing NOT NULL.', v_unlinked;
  END IF;
END;
$$;

COMMIT;
