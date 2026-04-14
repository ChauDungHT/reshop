import { Router } from 'express';
import { login, logout, registerCustomer, registerVendor } from './auth.controller';

const router = Router();

router.post('/register-customer', registerCustomer);
router.post('/register-vendor', registerVendor);
router.post('/login', login);
router.post('/logout', logout);

export default router;
