import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFullImageUrl, getThumbnailUrl } from '../shared/utils/image';

describe('Image Utility Functions', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api');
  });

  describe('getFullImageUrl', () => {
    it('should return fallback product placeholder when path is null, undefined, or empty', () => {
      expect(getFullImageUrl(null, 'product')).toBe('/assets/placeholders/default-product.png');
      expect(getFullImageUrl(undefined, 'product')).toBe('/assets/placeholders/default-product.png');
      expect(getFullImageUrl('', 'product')).toBe('/assets/placeholders/default-product.png');
    });

    it('should return fallback avatar placeholder when fallbackType is avatar and path is empty', () => {
      expect(getFullImageUrl(null, 'avatar')).toBe('/assets/placeholders/default-avatar.png');
      expect(getFullImageUrl(undefined, 'avatar')).toBe('/assets/placeholders/default-avatar.png');
      expect(getFullImageUrl('', 'avatar')).toBe('/assets/placeholders/default-avatar.png');
    });

    it('should return the original URL if path starts with http:// or https://', () => {
      expect(getFullImageUrl('http://example.com/image.png')).toBe('http://example.com/image.png');
      expect(getFullImageUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
    });

    it('should append relative paths to the base URL and normalize slashes', () => {
      expect(getFullImageUrl('uploads/avatars/avatar.webp')).toBe('http://localhost:8000/uploads/avatars/avatar.webp');
      expect(getFullImageUrl('/uploads/avatars/avatar.webp')).toBe('http://localhost:8000/uploads/avatars/avatar.webp');
    });

    it('should fallback to localhost:8000 if VITE_API_URL is empty', () => {
      vi.stubEnv('VITE_API_URL', '');
      expect(getFullImageUrl('uploads/image.webp')).toBe('http://localhost:8000/uploads/image.webp');
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return fallback product placeholder when path is empty', () => {
      expect(getThumbnailUrl(null)).toBe('/assets/placeholders/default-product.png');
      expect(getThumbnailUrl(undefined)).toBe('/assets/placeholders/default-product.png');
      expect(getThumbnailUrl('')).toBe('/assets/placeholders/default-product.png');
    });

    it('should replace main_{uuid}.webp with thumb_{uuid}.webp at the end of the URL', () => {
      const mainPath = 'uploads/products/123/main_abcdef123.webp';
      const expectedThumbUrl = 'http://localhost:8000/uploads/products/123/thumb_abcdef123.webp';
      expect(getThumbnailUrl(mainPath)).toBe(expectedThumbUrl);
    });

    it('should not modify the path if it does not match main_{uuid}.webp pattern at the end', () => {
      const otherPath = 'uploads/products/123/other_image.webp';
      const expectedUrl = 'http://localhost:8000/uploads/products/123/other_image.webp';
      expect(getThumbnailUrl(otherPath)).toBe(expectedUrl);
    });
  });
});
