# Database Migration Plan (Module 2)

This plan outlines the steps to perform the database schema migration according to `prompt/backend/01-migrate-database.md`, following `.agent/rule.md` and `.agent/structure.md`.

## User Review Required
> [!IMPORTANT]
> - A new field `average_rating` will be added to the `products` table to store the computed rating from the `reviews` table trigger.
> - The schema introduces `stock` directly into the `products` table as requested in `01-migrate-database.md`, overriding the `inventory` table pattern in `.agent/db.md` if any conflict exists.

## Proposed Changes

### Database Schema Update

#### [MODIFY] `schema.sql` (file:///e:/cd/reshop/backend/database/schema.sql)
1. **New Enums**:
   - `OrderStatus`: 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
   - `WalletTransactionType`: 'deposit', 'withdraw', 'refund', 'payment'
   - `ReturnStatus`: 'pending_vendor', 'approved', 'rejected', 'escalated', 'resolved_admin'
   - `ProductStatus`: 'active', 'inactive', 'out_of_stock'

2. **New Tables**:
   - `categories`: `id` (UUID), `name`, `slug`, `parent_id` (FK to categories)
   - `products`: `id` (UUID), `vendor_id` (FK to vendors), `category_id` (FK to categories), `name`, `description` (TEXT), `price` (DECIMAL), `stock` (INT), `is_featured` (BOOLEAN), `image_urls` (JSONB), `status` (ProductStatus), `average_rating` (DECIMAL)
   - `cart_items`: `id` (UUID), `user_id` (FK to users), `product_id` (FK to products), `quantity` (INT)
   - `orders`: `id` (UUID), `buyer_id` (FK to users), `order_code` (VARCHAR), `total_amount` (DECIMAL), `status` (OrderStatus), `shipping_address` (JSONB)
   - `order_items`: `id` (UUID), `order_id` (FK to orders), `product_id` (FK to products), `quantity` (INT), `price_snapshot` (DECIMAL)
   - `wallet_transactions`: `id` (UUID), `user_id` (FK to users), `amount` (DECIMAL), `type` (WalletTransactionType), `ref_id` (UUID/Nullable), `balance_after` (DECIMAL)
   - `reviews`: `id` (UUID), `order_id` (FK to orders), `product_id` (FK to products), `user_id` (FK to users), `stars` (INT, CHECK 1-5), `comment` (TEXT), `images` (JSONB), `vendor_reply` (TEXT)
   - `qa`: `id` (UUID), `product_id` (FK to products), `user_id` (FK to users), `question` (TEXT), `answer` (TEXT), `answered_by` (FK to vendors)
   - `return_requests`: `id` (UUID), `order_item_id` (FK to order_items), `reason` (VARCHAR), `description` (TEXT), `images` (JSONB), `status` (ReturnStatus)

3. **Database Triggers**:
   - PL/pgSQL function to calculate the average `stars` logic from the `reviews` table and update the corresponding `products.average_rating`.
   - The trigger will fire on `INSERT`, `UPDATE`, and `DELETE` on the `reviews` table.

## Logging Strategy
As stated in `.agent/log.md`, any manual scripts or system actions triggered during the db migration process will use the structure `[database]: <Event> at <Location>`.

## Verification Plan
1. **Automated Tests**: I will run the existing test suite via `npm run test` located in `backend/` as per `.agent/test.md` to ensure the new schema hasn't broken the existing integration tests. I will run `db:migrate` (if available via `node database/migrate.js`) to apply the schema.
2. **Manual Check**: I will run the backend dev server briefly to verify connectivity with the newly updated schema.
