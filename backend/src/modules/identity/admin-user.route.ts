import { Router } from 'express';
import { getUsers, getUserDetail, banUser, unbanUser, getPendingVendors, approveVendor, rejectVendor } from './admin-user.controller';
import { getDashboardStats, getDashboardCharts, exportOrdersReport } from './admin-stats.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Apply auth check and role restriction to all admin user management endpoints
router.use(authMiddleware);
router.use(roleGuard(['admin']));

router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/charts', getDashboardCharts);
router.get('/reports/orders/export', exportOrdersReport);

router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);

// Vendor Approval Routes
router.get('/vendors/pending', getPendingVendors);
router.post('/vendors/:id/approve', approveVendor);
router.post('/vendors/:id/reject', rejectVendor);

export default router;