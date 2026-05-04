import { Router } from 'express';
import { getCategories } from './category.controller';

const router = Router();

// Public route for fetching categories
router.get('/', getCategories);

export default router;
