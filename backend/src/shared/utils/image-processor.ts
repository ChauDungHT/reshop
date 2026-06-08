import sharp from 'sharp';

/**
 * Process avatar image: resize and crop to 400x400, convert to webp quality 85%.
 */
export const processAvatarImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .toFormat('webp', { quality: 85 })
    .toBuffer();
};

/**
 * Process product main image: resize width max 1200px (keep aspect ratio, no enlarge), convert to webp quality 85%.
 */
export const processProductMainImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .toFormat('webp', { quality: 85 })
    .toBuffer();
};

/**
 * Process product thumbnail image: resize to 200x200 crop center, convert to webp quality 85%.
 */
export const processProductThumbImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize(200, 200, { fit: 'cover', position: 'center' })
    .toFormat('webp', { quality: 85 })
    .toBuffer();
};
