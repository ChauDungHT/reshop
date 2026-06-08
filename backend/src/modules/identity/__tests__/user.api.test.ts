import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import userRoutes from '../user.route';
import path from 'path';

const app = express();
app.use(express.json());
const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';

// Setup app identically to server.ts but mock DB
// Mock Multer since we don't want to actually write files during purely logic unit tests
jest.mock('multer', () => {
  const multer = () => ({
    single: () => {
      // Mock middleware that simulates file upload
      return (req: any, res: any, next: any) => {
        req.file = {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          path: '/mocked/path/test.jpg',
          buffer: Buffer.from('mocking'),
          filename: 'avatar-test.jpg',
          size: 1024
        };
        next();
      };
    }
  });
  multer.diskStorage = () => jest.fn();
  multer.memoryStorage = () => jest.fn();
  return multer;
});

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn()
  }
}));

import db from '../../../core/db';

app.use('/api/users', userRoutes);

describe('User APIs Module 04', () => {

  let token: string;
  beforeEach(() => {
    jest.clearAllMocks();
    token = jwt.sign({ id: 'uuid-1234', role: 'customer' }, secret);
  });

  describe('GET /api/users/profile', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });

    it('should fetch profile with 200 on success', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'uuid-1234', name: 'Test User', wallet_balance: 150.00 }]
      });

      const res = await request(app).get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wallet_balance).toBe(150.00);
    });

    it('should return 404 if user not found', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update profile and return 200', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'uuid-1234', phone: '0123', address: '123 Street' }]
      });

      const res = await request(app).put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '0123', address: '123 Street' });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('0123');
    });

    it('should handle undefined column schema gracefully with 500', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce({ code: '42703' }); // Undefined column

      const res = await request(app).put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '0123', address: '123 Street' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Database schema not updated/i);
    });
  });

  describe('PUT /api/users/password', () => {
    it('should return 400 if old_password gets wrong match', async () => {
      const hashedOldPassword = await bcrypt.hash('realP@ssword', 12);
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ password_hash: hashedOldPassword }] // User mock returning hash
      });

      const res = await request(app).put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ old_password: 'wrongPassword', new_password: 'newSecretPassword' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Incorrect old password');
    });

    it('should return 200 when password perfectly updated', async () => {
      const hashedOldPassword = await bcrypt.hash('realP@ssword', 12);
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ password_hash: hashedOldPassword }] // mock select
      }).mockResolvedValueOnce({
        rows: [] // mock update
      });

      const res = await request(app).put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ old_password: 'realP@ssword', new_password: 'newSecretPassword' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/users/avatar', () => {
    it('should return 200 and return path to file uploaded', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({}); // mock update avatar_url

      const res = await request(app).post('/api/users/avatar')
        .set('Authorization', `Bearer ${token}`)
        // Since Multer is mocked, we can just send empty body
        // The mocked middleware will populate req.file.
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.avatar_url).toBe('/uploads/avatars/uuid-1234/avatar-test.jpg');
    });
  });

});
