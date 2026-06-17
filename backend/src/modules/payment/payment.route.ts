import { Router } from 'express';
import { handleVNPAYIPN, verifyPaymentReturn } from './payment.controller';

const router = Router();

// Endpoint IPN nhận kết quả bất đồng bộ từ VNPAY (Server-to-Server)
router.get('/vnpay-ipn', handleVNPAYIPN);

// Endpoint xác thực kết quả redirect trả về frontend
router.get('/verify-return', verifyPaymentReturn);

export default router;
