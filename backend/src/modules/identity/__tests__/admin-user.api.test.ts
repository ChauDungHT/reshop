import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import adminUserRoutes from '../admin-user.route';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    pool: {
      connect: jest.fn(() => Promise.resolve(mockClient)),
    },
  },
}));

import db from '../../../core/db';

app.use('/api/admin', adminUserRoutes);

describe('Admin User APIs Module', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
    customerToken = jwt.sign({ id: 'customer-uuid', role: 'customer' }, secret);
  });

  describe('Authorization and Role Checks', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Permission denied');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should retrieve list of users with pagination and return 200', async () => {
      const mockUsers = [
        { id: 'u1', name: 'User One', email: 'u1@example.com', role: 'customer', status: 'active' },
        { id: 'u2', name: 'User Two', email: 'u2@example.com', role: 'vendor', status: 'active' },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 2 }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Items query

      const res = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.total_pages).toBe(1);
    });

    it('should correctly apply dynamic filters for role, status and search query', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'u2', name: 'Vendor User', role: 'vendor', status: 'banned' }] });

      const res = await request(app)
        .get('/api/admin/users?role=vendor&status=banned&q=Vendor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledTimes(2);

      // Check first query (count query)
      const firstCallArgs = (db.query as jest.Mock).mock.calls[0];
      expect(firstCallArgs[0]).toContain('WHERE role = $1 AND status = $2 AND (name ILIKE $3 OR email ILIKE $3)');
      expect(firstCallArgs[1]).toEqual(['vendor', 'banned', '%Vendor%']);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return 404 if user does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/admin/users/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    it('should return detailed profile including orders and transactions count for a customer', async () => {
      const mockUser = {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'customer',
        status: 'active',
        wallet_balance: 100.5,
        created_at: '2026-05-22T00:00:00Z',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] }) // User query
        .mockResolvedValueOnce({ rows: [{ orders_count: 5, wallet_transactions_count: 3 }] }); // Stats query

      const res = await request(app)
        .get('/api/admin/users/customer-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('customer-1');
      expect(res.body.data.orders_count).toBe(5);
      expect(res.body.data.wallet_transactions_count).toBe(3);
      expect(res.body.data.vendor_profile).toBeNull();
    });

    it('should return detailed profile including vendor details and products count for a vendor', async () => {
      const mockUser = {
        id: 'vendor-user-1',
        name: 'Vendor One',
        email: 'v1@example.com',
        role: 'vendor',
        status: 'active',
        wallet_balance: 2500,
        created_at: '2026-05-22T00:00:00Z',
      };

      const mockVendor = {
        id: 'vendor-1',
        store_name: 'Super Store',
        slug: 'super-store',
        status: 'active',
        commission_rate: 5.5,
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] }) // User query
        .mockResolvedValueOnce({ rows: [{ orders_count: 12, wallet_transactions_count: 8 }] }) // Stats query
        .mockResolvedValueOnce({ rows: [mockVendor] }) // Vendor query
        .mockResolvedValueOnce({ rows: [{ count: 22 }] }); // Products count query

      const res = await request(app)
        .get('/api/admin/users/vendor-user-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('vendor-user-1');
      expect(res.body.data.orders_count).toBe(12);
      expect(res.body.data.vendor_profile).not.toBeNull();
      expect(res.body.data.vendor_profile.store_name).toBe('Super Store');
      expect(res.body.data.vendor_profile.products_count).toBe(22);
    });
  });

  describe('POST /api/admin/users/:id/ban', () => {
    it('should return 404 if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/admin/users/non-existent/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Spamming' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should return 400 when trying to ban an administrator', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'admin-2', role: 'admin' }] });

      const res = await request(app)
        .post('/api/admin/users/admin-2/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Rule violation' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot ban an administrator');
    });

    it('should ban a customer user successfully and return 200', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'cust-1', role: 'customer' }] }) // Check user
        .mockResolvedValueOnce({}); // Update users status

      const res = await request(app)
        .post('/api/admin/users/cust-1/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Spamming' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User banned successfully');
      expect(db.query).toHaveBeenCalledTimes(2);
      expect((db.query as jest.Mock).mock.calls[1][0]).toContain("UPDATE users SET status = 'banned'");
    });

    it('should ban a vendor and sync status to vendor record successfully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'vend-1', role: 'vendor' }] }) // Check user
        .mockResolvedValueOnce({}) // Update users status
        .mockResolvedValueOnce({}); // Update vendors status

      const res = await request(app)
        .post('/api/admin/users/vend-1/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Malicious activity' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(db.query).toHaveBeenCalledTimes(3);
      expect((db.query as jest.Mock).mock.calls[2][0]).toContain("UPDATE vendors SET status = 'banned'");
    });
  });

  describe('POST /api/admin/users/:id/unban', () => {
    it('should return 404 if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/admin/users/non-existent/unban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should unban a customer user successfully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'cust-1', role: 'customer' }] })
        .mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/admin/users/cust-1/unban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User unbanned successfully');
      expect((db.query as jest.Mock).mock.calls[1][0]).toContain("UPDATE users SET status = 'active'");
    });

    it('should unban a vendor and sync vendor status successfully', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'vend-1', role: 'vendor' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/admin/users/vend-1/unban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect((db.query as jest.Mock).mock.calls[2][0]).toContain("UPDATE vendors SET status = 'active'");
    });
  });

  describe('GET /api/admin/vendors/pending', () => {
    it('should reject non-admin request with 403', async () => {
      const res = await request(app)
        .get('/api/admin/vendors/pending')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('should return paginated pending vendors with 200', async () => {
      const mockPending = [
        { user_id: 'u1', name: 'Pending User', email: 'p1@example.com', store_name: 'Pending Store' }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: mockPending });

      const res = await request(app)
        .get('/api/admin/vendors/pending?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(5);
    });
  });

  describe('POST /api/admin/vendors/:id/approve', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockClient.query.mockReset();
      mockClient.release.mockReset();
    });

    it('should return 404 if user not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // user query inside transaction

      const res = await request(app)
        .post('/api/admin/vendors/non-existent/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 400 if user is not a vendor', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'customer', status: 'pending' }] }); // Check user

      const res = await request(app)
        .post('/api/admin/vendors/u1/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User is not a vendor');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return 400 if vendor is not pending', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'vendor', status: 'active' }] }); // Check user

      const res = await request(app)
        .post('/api/admin/vendors/u1/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Only pending vendors can be approved');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should approve vendor and commit transaction successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'vendor', status: 'pending' }] }) // Check user
        .mockResolvedValueOnce({}) // Update users
        .mockResolvedValueOnce({}) // Update vendors
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/admin/vendors/u1/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on connection error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB Connection Interrupted')); // Check user fails

      const res = await request(app)
        .post('/api/admin/vendors/u1/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/vendors/:id/reject', () => {
    it('should reject vendor successfully and return 200', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'vendor', status: 'pending' }] }) // Check user
        .mockResolvedValueOnce({}) // Update users
        .mockResolvedValueOnce({}); // Update vendors

      const res = await request(app)
        .post('/api/admin/vendors/u1/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Incomplete business license' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Vendor rejected successfully');
      expect((db.query as jest.Mock).mock.calls[1][0]).toContain("UPDATE users SET status = 'rejected'");
    });

    it('should return 400 if trying to reject an active vendor', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'u1', role: 'vendor', status: 'active' }] }); // Check user

      const res = await request(app)
        .post('/api/admin/vendors/u1/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Only pending vendors can be rejected');
    });
  });
});
