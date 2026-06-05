import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShopPage from './ShopPage';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('../../../../shared-ui/src/lib/axios', () => ({
  default: {
    get: mockGet,
  },
}));

import { MemoryRouter } from 'react-router-dom';

describe('ShopPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders home sections and product catalog from API', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('is_featured=true')) {
        return {
          data: {
            data: {
              items: [
                { id: 'f1', name: 'Featured Item', price: 1200000, image_urls: [], average_rating: 4.9, category_slug: 'dien-tu' },
              ],
            },
          },
        };
      }

      if (url.includes('limit=12')) {
        return {
          data: {
            data: {
              items: [
                { id: 'p1', name: 'Catalog Item', price: 550000, image_urls: [], average_rating: 4.5, category_slug: 'gia-dung' },
              ],
              total: 1,
              page: 1,
              limit: 12,
            },
          },
        };
      }

      if (url.includes('sort=latest')) {
        return {
          data: {
            data: {
              items: [
                { id: 'n1', name: 'Latest Item', price: 990000, image_urls: [], average_rating: 4.7, category_slug: 'thoi-trang' },
              ],
            },
          },
        };
      }

      return {
        data: {
          data: {
            items: [
              { id: 'p1', name: 'Catalog Item', price: 550000, image_urls: [], average_rating: 4.5, category_slug: 'gia-dung' },
            ],
            total: 1,
            page: 1,
            limit: 12,
          },
        },
      };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ShopPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Danh sách sản phẩm/i)).toBeDefined();
    expect(screen.getAllByText(/Sản phẩm nổi bật/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Mới nhất/i)[0]).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Catalog Item/i)).toBeDefined();
      expect(screen.getByText(/Featured Item/i)).toBeDefined();
      expect(screen.getByText(/Latest Item/i)).toBeDefined();
    });
  });
});
