# Prompt: Implement Admin Category Management APIs

## Context
Admins manage the product category hierarchy. Categories follow a tree structure (parent-child) and have strict deletion constraints.

## Reference
- Database Schema: `backend/database/schema.sql` (Table: `categories`, `products`)

## Requirements

### 1. GET /api/admin/categories/tree
- **Role**: Admin only.
- **Logic**: Fetch all categories and build a nested JSON structure. 
- **Efficiency**: Use a recursive CTE in PostgreSQL or efficient in-memory tree building in Node.js.
- **Output Format**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "Electronics",
        "children": [
          { "id": "...", "name": "Laptops", "children": [] }
        ]
      }
    ]
  }
}
```

### 2. POST /api/admin/categories
- **Payload**: `{ "name": "...", "parent_id": "UUID (optional)", "sort_order": 0 }`
- **Logic**: Generate `slug` automatically. Check for unique name/slug.

### 3. PUT /api/admin/categories/:id
- **Logic**: Support updating name, parent_id, and sort_order.

### 4. DELETE /api/admin/categories/:id
- **Constraint**: 
  - Check if any products are linked to this category: `SELECT 1 FROM products WHERE category_id = :id LIMIT 1`.
  - If exists -> Return **409 Conflict** with message "Cannot delete category with active products".
  - If no products -> Delete the category record.

## Verification
- Test the 409 Conflict scenario thoroughly.
- Ensure the tree structure is correctly nested.
- Check that `slug` generation is robust (kebab-case).
