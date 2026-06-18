-- Create Types (Enums)
-- Drop types if they exist (for clean migration)
DROP TYPE IF EXISTS UserRole CASCADE;
DROP TYPE IF EXISTS VendorStatus CASCADE;
DROP TYPE IF EXISTS OrderStatus CASCADE;
DROP TYPE IF EXISTS WalletTransactionType CASCADE;
DROP TYPE IF EXISTS ReturnStatus CASCADE;
DROP TYPE IF EXISTS ProductStatus CASCADE;
DROP TYPE IF EXISTS OrderFeedbackStatus CASCADE;
DROP TYPE IF EXISTS CouponType CASCADE;

CREATE TYPE UserRole AS ENUM ('customer', 'vendor', 'admin');

CREATE TYPE CouponType AS ENUM ('percentage', 'fixed');

CREATE TYPE VendorStatus AS ENUM ('inactive', 'active', 'banned');

CREATE TYPE OrderStatus AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
);

CREATE TYPE WalletTransactionType AS ENUM ('deposit', 'withdraw', 'refund', 'payment', 'pending_credit', 'pending_release');

CREATE TYPE OrderFeedbackStatus AS ENUM ('awaiting_feedback', 'reviewed', 'disputed', 'auto_completed');

CREATE TYPE ReturnStatus AS ENUM (
    'pending_vendor',
    'approved',
    'rejected',
    'escalated',
    'resolved_admin'
);

CREATE TYPE ProductStatus AS ENUM ('active', 'inactive', 'out_of_stock', 'deleted');

-- Users Table
CREATE TABLE IF NOT EXISTS
    users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role UserRole DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'active',
        wallet_balance DECIMAL(15, 2) DEFAULT 0,
        pending_balance DECIMAL(15, 2) DEFAULT 0,
        phone VARCHAR(20),
        address TEXT,
        avatar_url VARCHAR(255),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT now ()
    );

-- Fee Tiers Table
CREATE TABLE IF NOT EXISTS
    fee_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        tier_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Fee Tier Items Table
CREATE TABLE IF NOT EXISTS
    fee_tier_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        fee_tier_id UUID NOT NULL REFERENCES fee_tiers (id) ON DELETE CASCADE,
        fee_name VARCHAR(100) NOT NULL,
        fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('percentage', 'fixed')),
        fee_value DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        CONSTRAINT fee_tier_items_tier_name_unique UNIQUE (fee_tier_id, fee_name)
    );

-- Vendors Table
CREATE TABLE IF NOT EXISTS
    vendors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID UNIQUE REFERENCES users (id) ON DELETE CASCADE,
        store_name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        status VendorStatus DEFAULT 'inactive',
        commission_rate DECIMAL(5, 2) DEFAULT 0,
        bank_info JSONB,
        logo_url VARCHAR(255),
        banner_url VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        email VARCHAR(150),
        return_policy_days INT DEFAULT 7,
        return_policy_desc TEXT,
        fee_tier_id UUID REFERENCES fee_tiers (id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(150) NOT NULL,
    type            CouponType NOT NULL,
    value           DECIMAL(15,2) NOT NULL,
    min_order_value DECIMAL(15,2) DEFAULT 0,
    max_discount    DECIMAL(15,2) DEFAULT NULL,
    total_quantity  INT DEFAULT NULL,
    per_user_limit  INT DEFAULT 1,
    starts_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_vendor_coupon_code UNIQUE (vendor_id, code)
);

-- User Coupons Table (Wallet)
CREATE TABLE IF NOT EXISTS user_coupons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, coupon_id)
);

-- Tool Permissions Table
CREATE TABLE IF NOT EXISTS
    tool_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        tool_code VARCHAR(50) UNIQUE NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Seed tool permissions with default values allowing all roles initially
INSERT INTO tool_permissions (tool_code, tool_name, allowed_roles)
VALUES
  ('read_image', 'Đọc & dán hình ảnh từ clipboard', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('search_image', 'Tìm kiếm theo hình ảnh', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('product_recommendation', 'Gợi ý sản phẩm', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('chatbot', 'Chatbot', '["admin", "vendor", "customer", "guest"]'::jsonb),
  ('customer_consulting', 'Tư vấn khách hàng', '["admin", "vendor", "customer", "guest"]'::jsonb)
ON CONFLICT (tool_code) DO NOTHING;

-- Categories Table
-- Cây phân cấp 3 cấp dành cho shop cầu lông:
--   Cấp 1 (5 nhánh gốc): Vợt cầu lông | Giày cầu lông | Phụ kiện | Quần áo thể thao | Balo & Túi
--   Cấp 2: Vợt Yonex/Victor/Lining/Mizuno/Kumpoo | Giày nam/nữ/trẻ em |
--          Cước & Dây | Phụ kiện vợt | Áo/Quần thi đấu | Balo đựng vợt/Túi vợt đơn/Túi vợt đôi
--   Cấp 3: Yonex Astrox/Nanoflare | Victor Thruster/Jetspeed |
--          Lining N9/Windstorm | Cước mỏng/dày | Tay cầm & Grip/Giảm chấn
-- Seed data được quản lý tại: database/seeds/seed-data.js
CREATE TABLE IF NOT EXISTS
    categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        parent_id UUID REFERENCES categories (id) ON DELETE SET NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Products Table
CREATE TABLE IF NOT EXISTS
    products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        vendor_id UUID NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(15, 2) NOT NULL CHECK (price >= 0),
        stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
        is_featured BOOLEAN DEFAULT FALSE,
        image_urls JSONB,
        status ProductStatus DEFAULT 'active',
        average_rating DECIMAL(3, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        deleted_at TIMESTAMP WITH TIME ZONE
    );

-- Product Images Table
CREATE TABLE IF NOT EXISTS
    product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        url VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Cart Items Table
CREATE TABLE IF NOT EXISTS
    cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        quantity INT NOT NULL
            CHECK (quantity > 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        UNIQUE(user_id, product_id)
    );

-- Orders Table
CREATE TABLE IF NOT EXISTS
    orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        buyer_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        order_code VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(15, 2) NOT NULL,
        refunded_amount DECIMAL(15, 2) DEFAULT 0,         -- [Risk 5-B] accumulated refund total; NEVER modify total_amount
        status OrderStatus DEFAULT 'pending',
        shipping_address JSONB,
        payment_method       VARCHAR(20) DEFAULT 'cod',
        payment_status       VARCHAR(20) DEFAULT 'pending',
        vnpay_transaction_no VARCHAR(15),
        vnpay_bank_code      VARCHAR(20),
        vnpay_card_type      VARCHAR(20),
        vnpay_pay_date       TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Sub-Orders Table (one per vendor per parent order)
CREATE TABLE IF NOT EXISTS
    sub_orders (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        order_id          UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
        vendor_id         UUID REFERENCES vendors (id),              -- nullable: orphan fallback [Risk 4]
        sub_order_code    VARCHAR(60) NOT NULL,                      -- e.g. ORD-20260512-ABCDE-A
        status            VARCHAR(20) DEFAULT 'pending',
        subtotal          DECIMAL(15, 2) NOT NULL DEFAULT 0,
        shipping_fee      DECIMAL(15, 2) DEFAULT 0,
        vendor_discount   DECIMAL(15, 2) DEFAULT 0,
        platform_discount DECIMAL(15, 2) DEFAULT 0,                  -- [Risk 3] pro-rata platform voucher
        refunded_amount   DECIMAL(15, 2) DEFAULT 0,                  -- [Risk 5-B] accumulated refund
        coupon_id         UUID REFERENCES coupons(id) ON DELETE SET NULL,
        tracking_number   VARCHAR(100) NULL,
        feedback_status   OrderFeedbackStatus DEFAULT NULL,
        delivered_at      TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at        TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Order Items Table
CREATE TABLE IF NOT EXISTS
    order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
        sub_order_id UUID REFERENCES sub_orders (id) ON DELETE SET NULL,  -- links to vendor sub-order
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
        quantity INT NOT NULL
            CHECK (quantity > 0),
        price_snapshot DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS
    wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        amount DECIMAL(15, 2) NOT NULL,
        type WalletTransactionType NOT NULL,
        ref_id UUID,
        balance_after DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Reviews Table
CREATE TABLE IF NOT EXISTS
    reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        stars INT NOT NULL
            CHECK (stars >= 1 AND stars <= 5),
        comment TEXT,
        images JSONB,
        vendor_reply TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Q&A Table
CREATE TABLE IF NOT EXISTS
    qa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT,
        answered_by UUID REFERENCES vendors (id) ON DELETE SET NULL,
        answered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Return Requests Table
CREATE TABLE IF NOT EXISTS
    return_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        order_item_id UUID NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        images JSONB,
        status ReturnStatus DEFAULT 'pending_vendor',
        reject_reason TEXT,
        admin_notes TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- PL/pgSQL Function to Calculate Average Rating
CREATE OR REPLACE FUNCTION update_product_average_rating ()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET average_rating = (
        SELECT COALESCE(AVG(stars), 0)
        FROM reviews
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for Reviews Insert/Update/Delete
DROP TRIGGER IF EXISTS trg_update_average_rating_after_review ON reviews;
CREATE TRIGGER trg_update_average_rating_after_review
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_average_rating ();

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_vendors_slug ON vendors (slug);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);

CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products (vendor_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);

CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items (product_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders (buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_sub_order_id ON order_items (sub_order_id);

CREATE INDEX IF NOT EXISTS idx_sub_orders_order_id ON sub_orders (order_id);

CREATE INDEX IF NOT EXISTS idx_sub_orders_vendor_id ON sub_orders (vendor_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews (order_id);

CREATE INDEX IF NOT EXISTS idx_qa_product_id ON qa (product_id);

CREATE INDEX IF NOT EXISTS idx_qa_user_id ON qa (user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests (status);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

-- VNPAY Transactions Table
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

-- Coupon indexes
CREATE INDEX IF NOT EXISTS idx_coupons_vendor_id ON coupons(vendor_id);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON coupons(starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_coupon_id ON sub_orders(coupon_id);