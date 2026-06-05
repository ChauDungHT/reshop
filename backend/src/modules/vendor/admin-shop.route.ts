import { Router } from 'express';
import {
  getShops,
  updateShopStatus,
  getShopStats,
} from './admin-shop.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Apply auth check and role restriction to all admin shop oversight endpoints
router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/', getShops);
router.patch('/:id/status', updateShopStatus);
router.get('/:id/stats', getShopStats);

export default router;
