import { Router } from 'express';
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} from './admin-category.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Apply auth check and role restriction to all admin category management endpoints
router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/tree', getCategoryTree);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
