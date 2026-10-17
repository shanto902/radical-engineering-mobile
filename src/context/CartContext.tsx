import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Product, CartItem, SystemBuilderResults } from '../types';
import { storageService } from '../services/storage';

export interface CartToastData {
  product: Product;
  quantity: number;
  timestamp: number;
}

interface CartContextType {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (
    product: Product,
    quantity?: number,
    customPackage?: SystemBuilderResults,
    showNotification?: boolean
  ) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItemsCount: number;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  toast: CartToastData | null;
  hideToast: () => void;
  showToast: (product: Product, quantity?: number) => void;
  updateCartItems: (newCart: CartItem[]) => void;
  addMultipleToCart: (
    items: { product: Product; quantity: number }[],
    showNotification?: boolean
  ) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [toast, setToast] = useState<CartToastData | null>(null);

  useEffect(() => {
    storageService.getCart().then(items => {
      if (items) {
        const validItems = items.filter(item => {
          const p = item.customPackage?.estimatedCostBDT ?? item.product?.price;
          return p && p > 0;
        });
        setCart(validItems);
      }
    });
    storageService.getWishlist().then(ids => {
      if (ids) setWishlist(ids);
    });
  }, []);

  const saveCartItems = (newCart: CartItem[]) => {
    setCart(newCart);
    storageService.saveCart(newCart);
  };

  const saveWishlistItems = (newWishlist: string[]) => {
    setWishlist(newWishlist);
    storageService.saveWishlist(newWishlist);
  };

  const showToast = (product: Product, quantity = 1) => {
    setToast({ product, quantity, timestamp: Date.now() });
  };

  const hideToast = () => {
    setToast(null);
  };

  const addToCart = (
    product: Product,
    quantity = 1,
    customPackage?: SystemBuilderResults,
    showNotification = true
  ) => {
    // Call for price products (price 0) cannot be added to cart
    const itemPrice = customPackage?.estimatedCostBDT ?? product.price;
    if (!itemPrice || itemPrice <= 0) {
      return;
    }

    // Out of stock products cannot be added to cart
    if (!product.inStock) {
      Alert.alert(
        'Out of Stock',
        `"${product.title}" is currently out of stock and cannot be added to the cart.`
      );
      return;
    }

    const existingIndex = cart.findIndex(
      item => item.product.id === product.id && !item.customPackage && !customPackage
    );

    if (existingIndex > -1 && !customPackage) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      saveCartItems(updated);
    } else {
      const newItem: CartItem = {
        id: `${product.id}_${Date.now()}`,
        product,
        quantity,
        customPackage,
      };
      saveCartItems([...cart, newItem]);
    }

    // Trigger toast notification only if requested
    if (showNotification) {
      showToast(product, quantity);
    }
  };

  const addMultipleToCart = (
    items: { product: Product; quantity: number }[],
    showNotification = true
  ) => {
    const validItems = items.filter(
      it => it.product && it.product.inStock && it.quantity > 0 && it.product.price > 0
    );

    if (validItems.length < items.length) {
      Alert.alert(
        'Out of Stock Notice',
        'Some components were excluded because they are currently out of stock.'
      );
    }

    if (validItems.length === 0) return;

    let updated = [...cart];
    for (const { product, quantity } of validItems) {
      const idx = updated.findIndex(item => item.product.id === product.id && !item.customPackage);
      if (idx > -1) {
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity,
        };
      } else {
        updated.push({
          id: `${product.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          product,
          quantity,
        });
      }
    }
    saveCartItems(updated);
    if (showNotification && validItems.length > 0) {
      showToast(validItems[0].product, validItems.reduce((sum, it) => sum + it.quantity, 0));
    }
  };

  const removeFromCart = (itemId: string) => {
    const updated = cart.filter(item => item.id !== itemId);
    saveCartItems(updated);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const updated = cart
      .map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    saveCartItems(updated);
  };

  const clearCart = () => {
    saveCartItems([]);
  };

  const toggleWishlist = (productId: string) => {
    let updated: string[];
    if (wishlist.includes(productId)) {
      updated = wishlist.filter(id => id !== productId);
    } else {
      updated = [...wishlist, productId];
    }
    saveWishlistItems(updated);
  };

  const isWishlisted = (productId: string) => {
    return wishlist.includes(productId);
  };

  const totalAmount = cart.reduce((sum, item) => {
    const price = item.customPackage ? item.customPackage.estimatedCostBDT : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        addMultipleToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItemsCount,
        toggleWishlist,
        isWishlisted,
        toast,
        hideToast,
        showToast,
        updateCartItems: saveCartItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

