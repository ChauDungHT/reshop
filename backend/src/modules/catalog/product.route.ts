import { Router } from 'express';
import { getProducts, getProductById, createQuestion, uploadProductImages, deleteProductImage, setPrimaryImage } from './product.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { upload, handleMulterError } from '../../shared/middlewares/upload.middleware';

const router = Router();

// Public routes for fetching products
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected routes
router.post('/:id/qa', authMiddleware, createQuestion);
router.post('/:id/images', authMiddleware, upload.array('product_images', 5), handleMulterError, uploadProductImages);
router.delete('/:id/images/:imageId', authMiddleware, deleteProductImage);
router.put('/:id/images/:imageId/primary', authMiddleware, setPrimaryImage);

export default router;

