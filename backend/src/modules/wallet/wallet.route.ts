import { Router } from 'express';
import * as walletController from './wallet.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Tất cả các route ví đều yêu cầu đăng nhập
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.post('/topup', walletController.topup);
router.get('/history', walletController.getHistory);

export default router;
