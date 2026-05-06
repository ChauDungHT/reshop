import { Router } from 'express';
import * as checkoutController from './checkout.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Checkout yêu cầu đăng nhập
router.use(authMiddleware);

router.post('/', checkoutController.processCheckout);
router.get('/my', checkoutController.getMyOrders);
router.post('/:id/cancel', checkoutController.cancelOrder);
router.put('/:id/address', checkoutController.updateOrderAddress);

export default router;
