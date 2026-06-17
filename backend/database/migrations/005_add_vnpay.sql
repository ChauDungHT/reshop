-- Migration: Add VNPAY fields to orders and create vnpay_transactions table
-- Created At: 2026-06-10

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vnpay_transaction_no VARCHAR(15);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vnpay_bank_code VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vnpay_card_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vnpay_pay_date TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS vnpay_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID REFERENCES orders(id) ON DELETE SET NULL,
  txn_ref            VARCHAR(100) NOT NULL, -- maps to orders.order_code
  transaction_no     VARCHAR(15),           -- vnp_TransactionNo từ VNPAY
  command            VARCHAR(16) NOT NULL,  -- pay | querydr | refund
  amount             DECIMAL(15, 2) NOT NULL,
  response_code      VARCHAR(2),
  transaction_status VARCHAR(2),
  bank_code          VARCHAR(20),
  card_type          VARCHAR(20),
  raw_request        JSONB,
  raw_response       JSONB,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnpay_transactions_txn_ref ON vnpay_transactions(txn_ref);
CREATE INDEX IF NOT EXISTS idx_vnpay_transactions_order_id ON vnpay_transactions(order_id);
