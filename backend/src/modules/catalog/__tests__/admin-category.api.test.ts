import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminCategoryRoutes from '../admin-category.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

import db from '../../../core/db';

app.use('/api/admin/categories', adminCategoryRoutes);

describe('Admin Category APIs Module', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
    customerToken = jwt.sign({ id: 'customer-uuid', role: 'customer' }, secret);
  });

  describe('Authorization and Role Checks', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app).get('/api/admin/categories/tree');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/categories/tree')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Permission denied');
    });
  });

  describe('GET /api/admin/categories/tree', () => {
    it('should retrieve list of categories and build a nested tree structure', async () => {
      const mockCategories = [
        { id: '1', name: 'Electronics', slug: 'electronics', parent_id: null, sort_order: 0, created_at: '2026-05-25T00:00:00.000Z' },
        { id: '4', name: 'Home Appliances', slug: 'home-appliances', parent_id: null, sort_order: 1, created_at: '2026-05-25T00:00:00.000Z' },
        { id: '3', name: 'Accessories', slug: 'accessories', parent_id: '1', sort_order: 5, created_at: '2026-05-25T00:00:00.000Z' },
        { id: '2', name: 'Laptops', slug: 'laptops', parent_id: '1', sort_order: 10, created_at: '2026-05-25T00:00:00.000Z' },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: mockCategories });

      const res = await request(app)
        .get('/api/admin/categories/tree')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Checking structure and sorting
      const rootCategories = res.body.data.categories;
      expect(rootCategories).toHaveLength(2);
      
      // Sorted by sort_order: Electronics (0) comes first, then Home Appliances (1)
      expect(rootCategories[0].id).toBe('1');
      expect(rootCategories[1].id).toBe('4');

      // Check subcategories sorted by sort_order ASC, name ASC:
      // Accessories (5) comes before Laptops (10)
      const electronicsChildren = rootCategories[0].children;
      expect(electronicsChildren).toHaveLength(2);
      expect(electronicsChildren[0].id).toBe('3');
      expect(electronicsChildren[1].id).toBe('2');
    });
  });

  describe('POST /api/admin/categories', () => {
    it('should return 400 when name is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ', sort_order: 5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Category name is required');
    });

    it('should return 409 when category name or slug already exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] });

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Electronics', sort_order: 0 });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Category name or slug already exists');
    });

    it('should return 400 when parent_id is specified but does not exist', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // slug check
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // parent_id check

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Laptops', parent_id: 'non-existent-uuid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Parent category not found');
    });

    it('should create new category successfully with slug and default sort_order', async () => {
      const mockNewCategory = {
        id: '5',
        name: 'Smartphones',
        slug: 'smartphones',
        parent_id: '1',
        sort_order: 0,
        created_at: '2026-05-25T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // slug check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] }) // parent check
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockNewCategory] }); // insert

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Smartphones', parent_id: '1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Smartphones');
      expect(res.body.data.slug).toBe('smartphones');
      expect(res.body.data.parent_id).toBe('1');
      expect(res.body.data.sort_order).toBe(0);
    });
  });

  describe('PUT /api/admin/categories/:id', () => {
    it('should return 404 when category to update is not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request(app)
        .put('/api/admin/categories/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Category not found');
    });

    it('should return 400 when updating name to an invalid value', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '2', name: 'Laptops' }] });

      const res = await request(app)
        .put('/api/admin/categories/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Category name cannot be empty');
    });

    it('should return 409 when changing name to one that already exists', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '2', name: 'Laptops' }] }) // check exists
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] }); // check slug duplicate

      const res = await request(app)
        .put('/api/admin/categories/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Electronics' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Category name or slug already exists');
    });

    it('should return 400 when trying to set parent to itself', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '2', name: 'Laptops' }] });

      const res = await request(app)
        .put('/api/admin/categories/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parent_id: '2' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('A category cannot be its own parent');
    });

    it('should return 400 when trying to set parent that creates a nesting cycle', async () => {
      const mockCategory2 = { id: '2', name: 'Laptops', slug: 'laptops', parent_id: '1' };
      
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockCategory2] }) // check exists
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '3' }] }) // parent exists check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ parent_id: '2' }] }) // ancestor query (tracing parent_id of 3: it points to 2!)

      const res = await request(app)
        .put('/api/admin/categories/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parent_id: '3' }); // Setting parent of Laptops (2) to Accessories (3), but Accessories points to Laptops (2)

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot set parent to a descendant category (cycle detected)');
    });

    it('should update category details successfully', async () => {
      const mockCurrentCategory = { id: '2', name: 'Laptops', slug: 'laptops', parent_id: '1', sort_order: 10 };
      const mockUpdatedCategory = {
        id: '2',
        name: 'Notebooks',
        slug: 'notebooks',
        parent_id: null,
        sort_order: 15,
        created_at: '2026-05-25T00:00:00.000Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockCurrentCategory] }) // check exists
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // slug uniqueness check
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockUpdatedCategory] }); // update query

      const res = await request(app)
        .put('/api/admin/categories/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Notebooks', parent_id: null, sort_order: 15 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Notebooks');
      expect(res.body.data.slug).toBe('notebooks');
      expect(res.body.data.parent_id).toBeNull();
      expect(res.body.data.sort_order).toBe(15);
    });
  });

  describe('DELETE /api/admin/categories/:id', () => {
    it('should return 404 when category to delete is not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request(app)
        .delete('/api/admin/categories/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Category not found');
    });

    it('should return 409 Conflict when active products are linked to the category', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] }) // category exists
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'p1' }] }); // active products linked

      const res = await request(app)
        .delete('/api/admin/categories/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Cannot delete category with active products');
    });

    it('should delete category successfully when no products are linked', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: '1' }] }) // category exists
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // no products check
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // delete query

      const res = await request(app)
        .delete('/api/admin/categories/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Category deleted successfully');
    });
  });
});
