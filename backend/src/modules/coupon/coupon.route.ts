import { Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';
import * as couponController from './coupon.controller';

const router = Router();

// ==================== PUBLIC & CUSTOMER ROUTES ====================

// Lấy mã giảm giá của một sản phẩm (của shop đó) - public (hoặc có thông tin user để check is_collected)
router.get('/product/:id', authMiddleware, couponController.getProductCoupons);
// Dự phòng cho trường hợp khách vãng lai (không có authMiddleware)
router.get('/product/:id/public', (req, res, next) => { req.user = undefined; next(); }, couponController.getProductCoupons);

// Các route yêu cầu khách hàng đăng nhập
router.use('/me', authMiddleware);
router.post('/collect', authMiddleware, couponController.collectCoupon);
router.get('/me', authMiddleware, couponController.getMyCoupons);
router.post('/validate', authMiddleware, couponController.validateCouponsForCheckout);

// ==================== VENDOR ROUTES ====================
// Yêu cầu đăng nhập + quyền vendor
router.get('/vendor', authMiddleware, roleGuard(['vendor']), couponController.getVendorCoupons);
router.post('/vendor', authMiddleware, roleGuard(['vendor']), couponController.createVendorCoupon);
router.delete('/vendor/:id', authMiddleware, roleGuard(['vendor']), couponController.deleteVendorCoupon);

export default router;
