import { Router } from 'express';
import {
  getFeeTiers,
  getShopsWithFeeTier,
  updateShopFeeTier,
} from './admin-fee.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Apply auth check and role restriction to all admin fee management endpoints
router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/tiers', getFeeTiers);
router.get('/shops', getShopsWithFeeTier);
router.put('/shops/:id', updateShopFeeTier);

export default router;
