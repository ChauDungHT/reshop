import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { ICategory } from '../../shared/types/models';

/**
 * Generate a clean, kebab-case, URL-safe slug from a string.
 * Correctly normalizes Vietnamese and other unicode characters.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

interface TreeCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  children: TreeCategory[];
}

/**
 * GET /api/admin/categories/tree
 * Fetch all categories and build a nested tree structure.
 */
export const getCategoryTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      `SELECT id, name, slug, parent_id, sort_order, created_at 
       FROM categories 
       ORDER BY sort_order ASC, name ASC`
    );

    const categoriesList = result.rows as ICategory[];

    // Map categories to TreeCategory objects
    const categoryMap: Map<string, TreeCategory> = new Map();
    categoriesList.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id || null,
        sort_order: cat.sort_order,
        created_at: cat.created_at,
        children: [],
      });
    });

    const rootCategories: TreeCategory[] = [];

    // Assemble the tree structure
    categoriesList.forEach((cat) => {
      const treeNode = categoryMap.get(cat.id);
      if (treeNode) {
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          const parentNode = categoryMap.get(cat.parent_id);
          if (parentNode) {
            parentNode.children.push(treeNode);
          }
        } else {
          rootCategories.push(treeNode);
        }
      }
    });

    console.log(`[admin-category]: Get Category Tree Successful - 200 - ${categoriesList.length} categories total`);
    sendResponse(res, 200, true, 'Category tree retrieved successfully', {
      categories: rootCategories,
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-category]: GET /api/admin/categories/tree - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * POST /api/admin/categories
 * Create a new category with slug generation and validations.
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, parent_id, sort_order } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.log('[admin-category]: Create Category Failed - 400 - Missing or invalid name');
      sendResponse(res, 400, false, 'Category name is required');
      return;
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    const parentUuid: string | null = parent_id ? String(parent_id) : null;
    const sortOrderVal = typeof sort_order === 'number' ? sort_order : 0;

    // Check if name or slug already exists
    const duplicateCheck = await db.query(
      `SELECT id FROM categories WHERE name = $1 OR slug = $2 LIMIT 1`,
      [trimmedName, slug]
    );

    if (duplicateCheck.rowCount && duplicateCheck.rowCount > 0) {
      console.log(`[admin-category]: Create Category Failed - 409 - Name/Slug exists: ${trimmedName}`);
      sendResponse(res, 409, false, 'Category name or slug already exists');
      return;
    }

    // Verify parent category exists if parent_id is supplied
    if (parentUuid) {
      const parentCheck = await db.query(
        `SELECT id FROM categories WHERE id = $1 LIMIT 1`,
        [parentUuid]
      );
      if (!parentCheck.rowCount || parentCheck.rowCount === 0) {
        console.log(`[admin-category]: Create Category Failed - 400 - Parent ID not found: ${parentUuid}`);
        sendResponse(res, 400, false, 'Parent category not found');
        return;
      }
    }

    // Insert new category
    const insertResult = await db.query(
      `INSERT INTO categories (name, slug, parent_id, sort_order) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, slug, parent_id, sort_order, created_at`,
      [trimmedName, slug, parentUuid, sortOrderVal]
    );

    const newCategory = insertResult.rows[0] as ICategory;

    console.log(`[admin-category]: Create Category Successful - 201 - ID: ${newCategory.id}`);
    sendResponse(res, 201, true, 'Category created successfully', newCategory);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-category]: POST /api/admin/categories - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * PUT /api/admin/categories/:id
 * Update an existing category with validation and cycle detection.
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parent_id, sort_order } = req.body;

    // Fetch existing category
    const categoryCheck = await db.query(
      `SELECT id, name, slug, parent_id, sort_order FROM categories WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!categoryCheck.rowCount || categoryCheck.rowCount === 0) {
      console.log(`[admin-category]: Update Category Failed - 404 - Category not found: ${id}`);
      sendResponse(res, 404, false, 'Category not found');
      return;
    }

    const currentCategory = categoryCheck.rows[0] as ICategory;
    let finalName = currentCategory.name;
    let finalSlug = currentCategory.slug;
    let finalParentId = currentCategory.parent_id;
    let finalSortOrder = currentCategory.sort_order;

    // Process Name and Slug updates
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        console.log('[admin-category]: Update Category Failed - 400 - Invalid name');
        sendResponse(res, 400, false, 'Category name cannot be empty');
        return;
      }
      finalName = name.trim();
      finalSlug = slugify(finalName);

      // Check unique constraints for name/slug excluding this category
      const uniqueCheck = await db.query(
        `SELECT id FROM categories WHERE (name = $1 OR slug = $2) AND id != $3 LIMIT 1`,
        [finalName, finalSlug, id]
      );
      if (uniqueCheck.rowCount && uniqueCheck.rowCount > 0) {
        console.log(`[admin-category]: Update Category Failed - 409 - Name/Slug exists for another category: ${finalName}`);
        sendResponse(res, 409, false, 'Category name or slug already exists');
        return;
      }
    }

    // Process Sort Order updates
    if (sort_order !== undefined) {
      if (typeof sort_order !== 'number') {
        console.log('[admin-category]: Update Category Failed - 400 - Invalid sort_order type');
        sendResponse(res, 400, false, 'sort_order must be a number');
        return;
      }
      finalSortOrder = sort_order;
    }

    // Process Parent ID updates and Cycle Detection
    if (parent_id !== undefined) {
      const newParentId: string | null = parent_id ? String(parent_id) : null;

      if (newParentId) {
        // Rule: Category cannot be its own parent
        if (newParentId === id) {
          console.log(`[admin-category]: Update Category Failed - 400 - Cycle detected: parent_id equals category id`);
          sendResponse(res, 400, false, 'A category cannot be its own parent');
          return;
        }

        // Verify parent exists
        const parentCheck = await db.query(
          `SELECT id FROM categories WHERE id = $1 LIMIT 1`,
          [newParentId]
        );
        if (!parentCheck.rowCount || parentCheck.rowCount === 0) {
          console.log(`[admin-category]: Update Category Failed - 400 - Parent ID not found: ${newParentId}`);
          sendResponse(res, 400, false, 'Parent category not found');
          return;
        }

        // Trace path to root to detect nesting cycle
        let currentAncestorId: string | null = newParentId;
        while (currentAncestorId) {
          if (currentAncestorId === id) {
            console.log(`[admin-category]: Update Category Failed - 400 - Cycle detected: descendant path leads to parent`);
            sendResponse(res, 400, false, 'Cannot set parent to a descendant category (cycle detected)');
            return;
          }

          const ancestorQuery = await db.query(
            `SELECT parent_id FROM categories WHERE id = $1 LIMIT 1`,
            [currentAncestorId]
          );

          if (!ancestorQuery.rowCount || ancestorQuery.rowCount === 0) {
            break;
          }
          currentAncestorId = ancestorQuery.rows[0].parent_id ? String(ancestorQuery.rows[0].parent_id) : null;
        }
      }
      finalParentId = newParentId;
    }

    // Perform Update
    const updateResult = await db.query(
      `UPDATE categories 
       SET name = $1, slug = $2, parent_id = $3, sort_order = $4 
       WHERE id = $5 
       RETURNING id, name, slug, parent_id, sort_order, created_at`,
      [finalName, finalSlug, finalParentId, finalSortOrder, id]
    );

    const updatedCategory = updateResult.rows[0] as ICategory;

    console.log(`[admin-category]: Update Category Successful - 200 - ID: ${id}`);
    sendResponse(res, 200, true, 'Category updated successfully', updatedCategory);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-category]: PUT /api/admin/categories/${req.params.id} - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * DELETE /api/admin/categories/:id
 * Delete category under constraints. Deletes only when no active products are linked.
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if category exists
    const categoryCheck = await db.query(
      `SELECT id FROM categories WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!categoryCheck.rowCount || categoryCheck.rowCount === 0) {
      console.log(`[admin-category]: Delete Category Failed - 404 - Category not found: ${id}`);
      sendResponse(res, 404, false, 'Category not found');
      return;
    }

    // Constraint: Check if active products are linked
    const productCheck = await db.query(
      `SELECT 1 FROM products WHERE category_id = $1 LIMIT 1`,
      [id]
    );

    if (productCheck.rowCount && productCheck.rowCount > 0) {
      console.log(`[admin-category]: Delete Category Failed - 409 - Products linked to category: ${id}`);
      sendResponse(res, 409, false, 'Cannot delete category with active products');
      return;
    }

    // Delete category
    await db.query(
      `DELETE FROM categories WHERE id = $1`,
      [id]
    );

    console.log(`[admin-category]: Delete Category Successful - 200 - ID: ${id}`);
    sendResponse(res, 200, true, 'Category deleted successfully');
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-category]: DELETE /api/admin/categories/${req.params.id} - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
