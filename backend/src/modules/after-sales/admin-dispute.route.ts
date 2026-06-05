import { Router } from 'express';
import { getDisputes, resolveDispute } from './admin-dispute.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Secure all dispute resolution endpoints with admin guards
router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/', getDisputes);
router.post('/:id/resolve', resolveDispute);

export default router;
