import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import vendorRoutes from '../vendor.route';

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

app.use('/api/vendor', vendorRoutes);

describe('Vendor Fee Details API', () => {
  let vendorToken: string;
  let adminToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    vendorToken = jwt.sign({ id: 'vendor-user-uuid', role: 'vendor', vendor_id: 'vendor-uuid' }, secret);
    adminToken = jwt.sign({ id: 'admin-uuid', role: 'admin' }, secret);
  });

  it('should return 403 when user does not have vendor role', async () => {
    const res = await request(app)
      .get('/api/vendor/fees')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 when vendor_id is missing from token', async () => {
    const tokenNoVendor = jwt.sign({ id: 'vendor-user-uuid', role: 'vendor' }, secret);
    const res = await request(app)
      .get('/api/vendor/fees')
      .set('Authorization', `Bearer ${tokenNoVendor}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when vendor profile is not found in database', async () => {
    (db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .get('/api/vendor/fees')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Không tìm thấy thông tin người bán.');
  });

  it('should retrieve vendor fee tier and its fee items successfully', async () => {
    const mockVendor = {
      vendor_id: 'vendor-uuid',
      store_name: 'Test Badminton Shop',
      fee_tier_id: 'tier-uuid-1',
      tier_name: 'Hạng Đã Xác Thực',
      description: 'Shop đã KYC, nhận ưu đãi phí.',
    };

    const mockFeeItems = [
      { id: 'item-1', fee_name: 'Phí cố định', fee_type: 'fixed', fee_value: '2000' },
      { id: 'item-2', fee_name: 'Phí sàn phần trăm', fee_type: 'percentage', fee_value: '2.5' },
    ];

    (db.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockVendor] })
      .mockResolvedValueOnce({ rows: mockFeeItems });

    const res = await request(app)
      .get('/api/vendor/fees')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.store_name).toBe('Test Badminton Shop');
    expect(res.body.data.tier_name).toBe('Hạng Đã Xác Thực');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].fee_name).toBe('Phí cố định');
    expect(res.body.data.items[1].fee_value).toBe('2.5');
  });

  it('should fallback to Hạng Thường when vendor has no fee_tier_id set', async () => {
    const mockVendor = {
      vendor_id: 'vendor-uuid',
      store_name: 'New Shop',
      fee_tier_id: null,
      tier_name: null,
      description: null,
    };

    const mockDefaultTier = {
      id: 'default-tier-uuid',
      tier_name: 'Hạng Thường',
      description: 'Hạng phí mặc định dành cho nhà bán hàng chưa xác thực.',
    };

    const mockFeeItems = [
      { id: 'item-1', fee_name: 'Phí cố định', fee_type: 'fixed', fee_value: '3000' },
    ];

    (db.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockVendor] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [mockDefaultTier] })
      .mockResolvedValueOnce({ rows: mockFeeItems });

    const res = await request(app)
      .get('/api/vendor/fees')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tier_name).toBe('Hạng Thường');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].fee_name).toBe('Phí cố định');
  });
});
