%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '20px'}}}%%
erDiagram
    users {
        uuid id PK "gen_random_uuid()"
        varchar name
        varchar email "@unique @index"
        varchar password_hash
        varchar role "enum UserRole @default 'customer'"
        varchar status "@default 'active'"
        decimal wallet_balance "@default 0"
        varchar phone "@nullable"
        text address "@nullable"
        varchar avatar_url "@nullable"
        timestamptz last_login_at "@nullable"
        timestamptz created_at "@default now()"
    }
    
    vendors {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "@unique"
        varchar store_name
        varchar slug "@unique @index"
        varchar status "enum VendorStatus @default 'inactive'"
        decimal commission_rate "@default 0"
        jsonb bank_info
    }

    categories {
        uuid id PK "gen_random_uuid()"
        varchar name
        varchar slug "@unique @index"
        uuid parent_id FK "@nullable @index"
        timestamptz created_at "@default now()"
    }
    
    products {
        uuid id PK "gen_random_uuid()"
        uuid vendor_id FK "@index"
        uuid category_id FK "@index"
        varchar name
        text description
        decimal price
        integer stock "@default 0"
        boolean is_featured "@default FALSE"
        jsonb image_urls
        varchar status "enum ProductStatus @default 'active'"
        decimal average_rating "@default 0"
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }

    cart_items {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "@index"
        uuid product_id FK "@index"
        integer quantity
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }
    
    orders {
        uuid id PK "gen_random_uuid()"
        uuid buyer_id FK "@index"
        varchar order_code "@unique"
        decimal total_amount
        varchar status "enum OrderStatus @default 'pending'"
        jsonb shipping_address
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }
    
    order_items {
        uuid id PK "gen_random_uuid()"
        uuid order_id FK "@index"
        uuid product_id FK "@index"
        integer quantity
        decimal price_snapshot
        timestamptz created_at "@default now()"
    }

    wallet_transactions {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "@index"
        decimal amount
        varchar type "enum WalletTransactionType"
        uuid ref_id "@nullable"
        decimal balance_after
        timestamptz created_at "@default now()"
    }

    reviews {
        uuid id PK "gen_random_uuid()"
        uuid order_id FK "@index"
        uuid product_id FK "@index"
        uuid user_id FK "@index"
        integer stars
        text comment
        jsonb images
        text vendor_reply
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }

    qa {
        uuid id PK "gen_random_uuid()"
        uuid product_id FK "@index"
        uuid user_id FK "@index"
        text question
        text answer
        uuid answered_by FK "@nullable"
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }

    return_requests {
        uuid id PK "gen_random_uuid()"
        uuid order_item_id FK "@index"
        varchar reason
        text description
        jsonb images
        varchar status "enum ReturnStatus @default 'pending_vendor'"
        timestamptz created_at "@default now()"
        timestamptz updated_at "@default now()"
    }

    %% Relationships
    users ||--o| vendors : "owns"
    categories ||--o{ categories : "parent of"
    vendors ||--o{ products : "lists"
    categories ||--o{ products : "contains"
    
    users ||--o{ cart_items : "adds to cart"
    products ||--o{ cart_items : "added as"
    
    users ||--o{ orders : "places"
    orders ||--o{ order_items : "includes"
    products ||--o{ order_items : "ordered as"
    
    users ||--o{ wallet_transactions : "makes"
    
    orders ||--o{ reviews : "has"
    products ||--o{ reviews : "receives"
    users ||--o{ reviews : "writes"
    
    products ||--o{ qa : "has"
    users ||--o{ qa : "asks"
    vendors ||--o| qa : "answers"
    
    order_items ||--o{ return_requests : "requests return"