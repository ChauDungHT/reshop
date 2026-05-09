# Prompt: Implement Admin Category TreeView (Drag & Drop)

## Context
Category management is hierarchical. We need a tree-view component that allows admins to visualize the hierarchy and reorder categories via drag-and-drop.

## Reference
- API Endpoint: `GET /api/admin/categories/tree`, `PUT /api/admin/categories/:id`
- Library Recommendation: `dnd-kit` or `react-sortable-tree`.

## Requirements

### 1. Tree Visualization
- Render categories and their subcategories in a nested list.
- Each item should show: Name, Slug, Product Count (Badge).
- Ability to expand/collapse parent categories.

### 2. Drag & Drop Logic
- Allow moving categories within the same level to change `sort_order`.
- Allow moving a category into another to change its `parent_id`.
- On drop, call the backend API to save the new structure.

### 3. CRUD Actions
- **Add**: Button to open a "New Category" modal (pre-selects parent if clicked from a parent node).
- **Edit**: Inline edit or modal.
- **Delete**: Check for product count > 0 before allowing (Backend will enforce this, but UI should show a warning).

## Expected Output
- `CategoryManagement.tsx`
- `CategoryNode.tsx` (Draggable/Droppable item)
- `CategoryModal.tsx`

## Verification
- Verify that moving a category correctly updates the database via network tab.
- Nested structures should render correctly up to at least 3 levels deep.
