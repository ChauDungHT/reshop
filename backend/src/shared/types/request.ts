import { Request } from 'express';

export interface UploadRequest extends Request {
  processedImages?: string[];
  processedImage?: string;
  logoUrl?: string;
  bannerUrl?: string;
}
