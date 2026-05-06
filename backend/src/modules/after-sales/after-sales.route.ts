import { Router } from 'express';
import * as afterSalesController from './after-sales.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleGuard } from '../../shared/middlewares/role.guard';

const router = Router();

// Hầu hết các tính năng hậu mãi yêu cầu login
router.use(authMiddleware);

// Reviews
router.post('/reviews', afterSalesController.createReview);

// QA
router.post('/qa/ask', afterSalesController.askQuestion);
router.delete('/qa/:id', afterSalesController.deleteQuestion);

// Returns
router.post('/returns', afterSalesController.createReturnRequest);
router.put('/returns/:id/approve', roleGuard(['admin', 'vendor']), afterSalesController.approveReturn);

export default router;
