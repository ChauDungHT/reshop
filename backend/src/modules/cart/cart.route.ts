import { Router } from 'express';
import * as cartController from './cart.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.post('/sync', cartController.syncCart);
router.put('/:id', cartController.updateQuantity);
router.delete('/:id', cartController.removeFromCart);

export default router;
