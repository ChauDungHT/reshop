import { Router } from 'express';
import { login, logout, registerCustomer, registerVendor } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';
import { ownerGuard } from '../../shared/middlewares/owner.guard';

const router = Router();

router.post('/register-customer', registerCustomer);
router.post('/register-vendor', registerVendor);
router.post('/login', login);
router.post('/logout', logout);

// --- CÁC ROUTE TEST MIDDLEWARE VỪA ĐẠT ĐƯỢC ---
// Tiền tố Prefix tại server.ts đang là: /api/auth

// 1. Test authMiddleware (Yêu cầu phải có Token hợp lệ)
// Xoay quanh URL: GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.status(200).json({ success: true, message: 'Passed Auth Middleware', user: req.user });
});

// 2. Test roleGuard (Yêu cầu Token hợp lệ + Role phải là Admin)
// Xoay quanh URL: GET /api/auth/admin-only
router.get('/admin-only', authMiddleware, roleGuard(['admin']), (req, res) => {
  res.status(200).json({ success: true, message: 'Passed Role Guard (Admin only)' });
});

// 3. Test ownerGuard (Yêu cầu Token + ID trên tham số URL phải lấy rọi đúng với ID trong Token)
// Xoay quanh URL: PUT /api/auth/update-profile/:id
router.put('/update-profile/:id', authMiddleware, ownerGuard('id', false), (req, res) => {
  res.status(200).json({ success: true, message: `Passed Owner Guard - Successfully updated profile ${req.params.id}` });
});

export default router;
