-- ============================================================
-- Migration 002: Create tool_permissions table
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tool_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_code VARCHAR(50) UNIQUE NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed tool permissions with default values allowing all roles initially
INSERT INTO tool_permissions (tool_code, tool_name, allowed_roles)
VALUES
  ('read_image', 'Đọc thông tin từ hình ảnh', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('search_image', 'Tìm kiếm theo hình ảnh', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('product_recommendation', 'Gợi ý sản phẩm', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('chatbot', 'Chatbot', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('customer_consulting', 'Tư vấn khách hàng', '["admin", "vendor", "customer", "guest"]'::jsonb)
ON CONFLICT (tool_code) DO NOTHING;

COMMIT;
