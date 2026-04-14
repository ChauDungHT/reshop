-- Create Types (Enums)
CREATE TYPE UserRole AS ENUM ('customer', 'vendor', 'admin');
CREATE TYPE VendorStatus AS ENUM ('inactive', 'active', 'banned');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role UserRole DEFAULT 'customer',
    status VARCHAR(20) DEFAULT 'active',
    wallet_balance DECIMAL(15,2) DEFAULT 0,
    phone VARCHAR(20),
    address TEXT,
    avatar_url VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    status VendorStatus DEFAULT 'inactive',
    commission_rate DECIMAL(5,2) DEFAULT 0,
    bank_info JSONB
);

-- Create Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vendors_slug ON vendors(slug);
