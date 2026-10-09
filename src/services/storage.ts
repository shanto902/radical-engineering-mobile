import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Appliance } from '../types';

export interface SavedCustomDevice {
  id: string;
  name: string;
  wattage: number;
  icon: string;
  category: string;
}

export interface SavedCustomerInfo {
  phone: string;
  name: string;
  address: string;
  notes?: string;
}

export interface LocalOrderRecord {
  orderId: string;
  customerName: string;
  phone: string;
  total: number;
  date: string;
  itemsCount: number;
}

const KEYS = {
  CART: '@radical_cart_items',
  WISHLIST: '@radical_wishlist_ids',
  THEME_MODE: '@radical_theme_mode',
  RECENT_SEARCHES: '@radical_recent_searches',
  BUILDER_APPLIANCES: '@radical_builder_appliances',
  BUILDER_CUSTOM_DEVICES: '@radical_builder_custom_devices',
  BUILDER_BACKUP_HOURS: '@radical_builder_backup_hours',
  BUILDER_SOLAR_HYBRID: '@radical_builder_solar_hybrid',
  CHECKOUT_CUSTOMER_INFO: '@radical_checkout_customer_info',
  LOCAL_PLACED_ORDERS: '@radical_local_placed_orders',
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

  // --- System Builder Persistence ---
  async getBuilderAppliances(): Promise<Appliance[] | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BUILDER_APPLIANCES);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveBuilderAppliances(appliances: Appliance[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BUILDER_APPLIANCES, JSON.stringify(appliances));
    } catch {
      // ignore
    }
  },

  async getBuilderCustomDevices(): Promise<SavedCustomDevice[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BUILDER_CUSTOM_DEVICES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveBuilderCustomDevices(devices: SavedCustomDevice[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BUILDER_CUSTOM_DEVICES, JSON.stringify(devices));
    } catch {
      // ignore
    }
  },

  async getBuilderBackupHours(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BUILDER_BACKUP_HOURS);
      return data !== null ? parseFloat(data) : null;
    } catch {
      return null;
    }
  },

  async saveBuilderBackupHours(hours: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BUILDER_BACKUP_HOURS, hours.toString());
    } catch {
      // ignore
    }
  },

  async getBuilderSolarHybrid(): Promise<boolean | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BUILDER_SOLAR_HYBRID);
      return data !== null ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveBuilderSolarHybrid(isHybrid: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BUILDER_SOLAR_HYBRID, JSON.stringify(isHybrid));
    } catch {
      // ignore
    }
  },

  async clearBuilderState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.BUILDER_APPLIANCES,
        KEYS.BUILDER_BACKUP_HOURS,
        KEYS.BUILDER_SOLAR_HYBRID,
      ]);
    } catch {
      // ignore
    }
  },

  // --- Checkout Customer Info Persistence ---
  async getCheckoutCustomerInfo(): Promise<SavedCustomerInfo | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CHECKOUT_CUSTOMER_INFO);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async saveCheckoutCustomerInfo(info: SavedCustomerInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CHECKOUT_CUSTOMER_INFO, JSON.stringify(info));
    } catch {
      // ignore
    }
  },

  async clearCheckoutCustomerInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.CHECKOUT_CUSTOMER_INFO);
    } catch {
      // ignore
    }
  },

  // --- Local Placed Orders History ---
  async getLocalPlacedOrders(): Promise<LocalOrderRecord[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.LOCAL_PLACED_ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveLocalPlacedOrder(order: LocalOrderRecord): Promise<void> {
    try {
      const current = await this.getLocalPlacedOrders();
      const updated = [order, ...current.filter((o) => o.orderId !== order.orderId)].slice(0, 50);
      await AsyncStorage.setItem(KEYS.LOCAL_PLACED_ORDERS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },
};
