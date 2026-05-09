import { Router } from 'express';
import * as walletController from './wallet.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Route callback cho VNPay (IPN) không cần auth token vì VNPay gọi server-to-server
router.get('/vnpay/callback', walletController.vnpayCallback);

// Tất cả các route ví khác đều yêu cầu đăng nhập
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.post('/topup', walletController.topup);
router.get('/history', walletController.getHistory);
router.post('/vnpay/create-payment', walletController.createVNPayPayment);

export default router;
