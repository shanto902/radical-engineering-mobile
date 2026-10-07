import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '../types';

const KEYS = {
  CART: '@radical_cart_items',
  WISHLIST: '@radical_wishlist_ids',
  THEME_MODE: '@radical_theme_mode',
  RECENT_SEARCHES: '@radical_recent_searches',
};

export const storageService = {
  async getCart(): Promise<CartItem[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveCart(items: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CART, JSON.stringify(items));
    } catch {
      // ignore
    }
  },

  async getWishlist(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.WISHLIST);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveWishlist(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.WISHLIST, JSON.stringify(ids));
    } catch {
      // ignore
    }
  },

  async getThemeMode(): Promise<'light' | 'dark' | 'system'> {
    try {
      const data = await AsyncStorage.getItem(KEYS.THEME_MODE);
      return (data as any) || 'system';
    } catch {
      return 'system';
    }
  },

  async saveThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.THEME_MODE, mode);
    } catch {
      // ignore
    }
  },
};

