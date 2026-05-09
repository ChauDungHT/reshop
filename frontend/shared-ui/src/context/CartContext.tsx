import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../lib/axios';
import { useAuth } from './AuthContext';
import type { IProduct, IApiResponse } from '../types';

export interface CartItem {
  id: string; // id in DB or product_id if not in DB
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  current_stock: number;
  image_urls: string[] | null;
  selected?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: IProduct, quantity: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleSelect: (id: string) => void;
  selectAll: (selected: boolean) => void;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'reshop_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load initial cart
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      if (user) {
        try {
          const res = await axiosInstance.get<IApiResponse<CartItem[]>>('/cart');
          if (res.data.success) {
            setCartItems(res.data.data.map((item) => ({ ...item, selected: true })));
          }
        } catch (err) {
          console.error('Failed to fetch cart from server', err);
        }
      } else {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          setCartItems(JSON.parse(localData));
        }
      }
      setIsLoading(false);
    };

    loadCart();
  }, [user]);

  // 2. Persist to localStorage (if guest)
  useEffect(() => {
    if (!user && !isLoading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems, user, isLoading]);

  // 3. Sync logic when user logs in
  const syncCart = useCallback(async () => {
    if (!user) return;
    
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!localData) return;

    const items = JSON.parse(localData);
    if (items.length === 0) return;

    try {
      await axiosInstance.post('/cart/sync', {
        items: items.map((i: CartItem) => ({ product_id: i.product_id, quantity: i.quantity }))
      });
      // Refresh cart from server
      const res = await axiosInstance.get<IApiResponse<CartItem[]>>('/cart');
      if (res.data.success) {
        setCartItems(res.data.data.map((item) => ({ ...item, selected: true })));
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to sync cart', err);
    }
  }, [user]);

  // Trigger sync on login
  useEffect(() => {
    if (user) {
      syncCart();
    }
  }, [user, syncCart]);

  const addItem = async (product: IProduct, quantity: number) => {
    if (user) {
      try {
        await axiosInstance.post('/cart', { product_id: product.id, quantity });
        const res = await axiosInstance.get<IApiResponse<CartItem[]>>('/cart');
        setCartItems(res.data.data.map((item) => ({ ...item, selected: true })));
      } catch (err) {
        console.error('Add to cart failed', err);
      }
    } else {
      setCartItems(prev => {
        const existing = prev.find(i => i.product_id === product.id);
        if (existing) {
          return prev.map(i => i.product_id === product.id 
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) } 
            : i
          );
        }
        return [...prev, {
          id: Math.random().toString(36).substring(7),
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          current_stock: product.stock,
          image_urls: product.image_urls || null,
          selected: true
        }];
      });
    }
  };

  const removeItem = async (id: string) => {
    if (user) {
      try {
        await axiosInstance.delete(`/cart/${id}`);
        setCartItems(prev => prev.filter(i => i.id !== id));
      } catch (err) {
        console.error('Remove failed', err);
      }
    } else {
      setCartItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (user) {
      try {
        await axiosInstance.put(`/cart/${id}`, { quantity });
        setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
      } catch (err) {
        console.error('Update failed', err);
      }
    } else {
      setCartItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  const toggleSelect = (id: string) => {
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const selectAll = (selected: boolean) => {
    setCartItems(prev => prev.map(i => i.current_stock > 0 ? { ...i, selected } : i));
  };

  const clearCart = () => {
    setCartItems([]);
    if (!user) localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, addItem, removeItem, updateQuantity, toggleSelect, selectAll, clearCart, syncCart, isLoading 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
