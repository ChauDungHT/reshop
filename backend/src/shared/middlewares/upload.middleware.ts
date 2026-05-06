import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Đảm bảo thư mục temp tồn tại
const tempDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Cấu hình Multer lưu tạm vào uploads/temp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Chặn các file không phải JPG/PNG và giới hạn 5MB
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận định dạng ảnh JPG/PNG') as any, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Middleware xử lý ảnh sau khi upload lên thư mục temp.
 * Thực hiện: Resize (max 1200px), Chuyển WebP, Lưu vào products/{vendor_id}/ hoặc vendors/{vendor_id}/
 */
export const processProductImages = async (req: Request, res: Response, next: NextFunction) => {
  // Lấy vendorId từ user (authMiddleware cấp)
  const vendorId = req.user?.vendor_id || 'unassigned';
  const productDir = path.join(process.cwd(), 'uploads', 'products', vendorId);
  const vendorAssetsDir = path.join(process.cwd(), 'uploads', 'vendors', vendorId);

  // Đảm bảo các thư mục đích tồn tại
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });
  if (!fs.existsSync(vendorAssetsDir)) fs.mkdirSync(vendorAssetsDir, { recursive: true });

  const processedFiles: string[] = [];

  try {
    // 1. Xử lý req.files (nếu dùng .array() hoặc .fields())
    if (req.files) {
      if (Array.isArray(req.files)) {
        // Trường hợp upload.array('images')
        for (const file of req.files) {
          const result = await processSingleFile(file, productDir, vendorId, 'products');
          processedFiles.push(result);
        }
        (req as any).processedImages = processedFiles;
      } else {
        // Trường hợp upload.fields([{ name: 'logo' }, { name: 'banner' }])
        const fieldFiles = req.files as { [fieldname: string]: Express.Multer.File[] };
        for (const fieldName in fieldFiles) {
          if (fieldFiles[fieldName] && fieldFiles[fieldName].length > 0) {
            const file = fieldFiles[fieldName][0];
            const result = await processSingleFile(file, vendorAssetsDir, vendorId, 'vendors');
            (req as any)[`${fieldName}Url`] = result;
          }
        }
      }
    } 
    // 2. Xử lý req.file (nếu dùng .single())
    else if (req.file) {
      const result = await processSingleFile(req.file, productDir, vendorId, 'products');
      (req as any).processedImage = result;
    }

    next();
  } catch (error) {
    console.error('[Error - upload]: Image processing failed', error);
    next(error);
  }
};

/**
 * Helper xử lý từng file đơn lẻ
 */
async function processSingleFile(file: Express.Multer.File, destDir: string, vendorId: string, subPath: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.webp`;
  const outputPath = path.join(destDir, filename);

  await sharp(file.path)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  // Xóa file tạm
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return `/uploads/${subPath}/${vendorId}/${filename}`;
}
