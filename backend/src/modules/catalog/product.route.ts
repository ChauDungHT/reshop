import { Router } from 'express';
import { getProducts, getProductById } from './product.controller';

const router = Router();

// Public routes for fetching products
router.get('/', getProducts);
router.get('/:id', getProductById);

export default router;
