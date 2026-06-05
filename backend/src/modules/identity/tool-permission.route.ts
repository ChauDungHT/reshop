import { Router } from 'express';
import { getToolPermissions, updateToolPermissionsBulk } from './tool-permission.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// GET is public so storefront users can check their permissions
router.get('/', getToolPermissions);

// PUT is restricted to Admins only
router.put('/admin', authMiddleware, roleGuard(['admin']), updateToolPermissionsBulk);

export default router;
