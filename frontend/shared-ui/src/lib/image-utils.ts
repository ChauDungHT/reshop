import { BASE_URL } from './axios';

/**
 * Chuyển đổi một đường dẫn ảnh từ DB sang URL hoàn chỉnh để hiển thị trên UI.
 * @param url Đường dẫn tương đối (ví dụ: /uploads/...) hoặc tuyệt đối
 * @returns URL hoàn chỉnh
 */
export const getFullImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  // Đảm bảo có dấu gạch chéo ở đầu nếu là đường dẫn tương đối
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  
  return `${BASE_URL}${normalizedPath}`;
};
