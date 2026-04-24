%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '25px'}}}%%
erDiagram
    users {
        uuid id PK "gen_random_uuid()"
        varchar name
        varchar email "@unique @index"
        varchar password_hash
        varchar role "enum UserRole"
        varchar status "enum UserStatus"
        varchar phone "@nullable"
        text address "@nullable"
        decimal wallet_balance "@default 0"
        text avatar_url "@nullable"
        timestamptz created_at "@default now()"
    }
    
    vendors {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "@unique"
        varchar store_name
        varchar slug "@unique @index"
        varchar status "enum VendorStatus"
        decimal commission_rate
        jsonb bank_info
    }
    
    products {
        uuid id PK "gen_random_uuid()"
        uuid vendor_id FK "@index"
        varchar sku "@unique"
        varchar name
        decimal price
        varchar status "enum ProductStatus"
    }
    
    inventory {
        uuid id PK "gen_random_uuid()"
        uuid product_id FK "@unique"
        uuid vendor_id FK "@index"
        integer quantity "@default 0"
        integer reserved_qty "@default 0"
    }
    
    orders {
        uuid id PK "gen_random_uuid()"
        uuid buyer_id FK "@index"
        varchar status "enum OrderStatus"
        decimal total_amount
        timestamptz placed_at "@default now()"
    }
    
    vendor_orders {
        uuid id PK "gen_random_uuid()"
        uuid order_id FK
        uuid vendor_id FK "@index(vendor_id, status)"
        decimal subtotal
        decimal commission
        varchar status "@index(vendor_id, status)"
    }
    
    order_items {
        uuid id PK "gen_random_uuid()"
        uuid vendor_order_id FK
        uuid product_id FK "@index"
        integer quantity
        decimal unit_price
    }
    
    payouts {
        uuid id PK "gen_random_uuid()"
        uuid vendor_id FK "@index"
        decimal amount
        varchar status "enum PayoutStatus"
        timestamptz created_at "@default now()"
        timestamptz scheduled_at
    }

    users ||--o| vendors : "owns"
    vendors ||--o{ products : "lists"
    products ||--|| inventory : "tracked in"
    users ||--o{ orders : "places"
    orders ||--o{ vendor_orders : "split into"
    vendors ||--o{ vendor_orders : "fulfils"
    vendor_orders ||--o{ order_items : "contains"
    vendors ||--o{ payouts : "receives"