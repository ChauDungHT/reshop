import { Router } from 'express';
import { getProfile, updateProfile, updatePassword, uploadAvatar } from './user.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { upload, handleMulterError } from '../../shared/middlewares/upload.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

// Apply multer before controller
router.post('/avatar', upload.single('avatar'), handleMulterError, uploadAvatar);
router.post('/profile/avatar', upload.single('avatar'), handleMulterError, uploadAvatar);

export default router;
