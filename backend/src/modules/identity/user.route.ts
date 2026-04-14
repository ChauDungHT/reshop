import { Router, Request } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getProfile, updateProfile, updatePassword, uploadAvatar } from './user.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const dir = path.join(__dirname, '../../../../uploads/avatars', userId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.use(authMiddleware);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);

// Apply multer before controller
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
