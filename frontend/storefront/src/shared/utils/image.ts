/**
 * Image utility functions for storefront
 */

export const getFullImageUrl = (
  path?: string | null,
  fallbackType: 'avatar' | 'product' = 'product'
): string => {
  if (!path) {
    return fallbackType === 'avatar'
      ? '/assets/placeholders/default-avatar.png'
      : '/assets/placeholders/default-product.png';
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
    .replace('/api', '')
    .replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};

export const getThumbnailUrl = (path?: string | null): string => {
  if (!path) {
    return getFullImageUrl(null, 'product');
  }

  const fullUrl = getFullImageUrl(path, 'product');
  return fullUrl.replace(/\/main_([^/]+)$/, '/thumb_$1');
};
