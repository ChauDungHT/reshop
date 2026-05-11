import { Router } from 'express';
import { getProducts, getProductById, createQuestion } from './product.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

// Public routes for fetching products
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected routes
router.post('/:id/qa', authMiddleware, createQuestion);

export default router;

