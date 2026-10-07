import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, CartItem, SystemBuilderResults } from '../types';
import { storageService } from '../services/storage';

interface CartContextType {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (product: Product, quantity?: number, customPackage?: SystemBuilderResults) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItemsCount: number;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    storageService.getCart().then(items => {
      if (items) setCart(items);
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

  const addToCart = (product: Product, quantity = 1, customPackage?: SystemBuilderResults) => {
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
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItemsCount,
        toggleWishlist,
        isWishlisted,
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

