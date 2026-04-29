-- Create Types (Enums)
-- Drop types if they exist (for clean migration)
DROP TYPE IF EXISTS UserRole CASCADE;
DROP TYPE IF EXISTS VendorStatus CASCADE;
DROP TYPE IF EXISTS OrderStatus CASCADE;
DROP TYPE IF EXISTS WalletTransactionType CASCADE;
DROP TYPE IF EXISTS ReturnStatus CASCADE;
DROP TYPE IF EXISTS ProductStatus CASCADE;

CREATE TYPE UserRole AS ENUM ('customer', 'vendor', 'admin');

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

CREATE TYPE WalletTransactionType AS ENUM ('deposit', 'withdraw', 'refund', 'payment');

CREATE TYPE ReturnStatus AS ENUM (
    'pending_vendor',
    'approved',
    'rejected',
    'escalated',
    'resolved_admin'
);

CREATE TYPE ProductStatus AS ENUM ('active', 'inactive', 'out_of_stock');

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
        phone VARCHAR(20),
        address TEXT,
        avatar_url VARCHAR(255),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT now ()
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
        bank_info JSONB
    );

-- Categories Table
CREATE TABLE IF NOT EXISTS
    categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        parent_id UUID REFERENCES categories (id) ON DELETE SET NULL,
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
        price DECIMAL(15, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        image_urls JSONB,
        status ProductStatus DEFAULT 'active',
        average_rating DECIMAL(3, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
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
        status OrderStatus DEFAULT 'pending',
        shipping_address JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now (),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now ()
    );

-- Order Items Table
CREATE TABLE IF NOT EXISTS
    order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews (order_id);

CREATE INDEX IF NOT EXISTS idx_qa_product_id ON qa (product_id);

CREATE INDEX IF NOT EXISTS idx_qa_user_id ON qa (user_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_item_id ON return_requests (order_item_id);

CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests (status);