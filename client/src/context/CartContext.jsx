import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const CART_KEY_PREFIX = 'seculicense_cart_';
const CartContext = createContext(null);

export function getCartStorageKey(user) {
  return `${CART_KEY_PREFIX}${user?.userId || user?.id || 'guest'}`;
}

export function readCartForKey(storageKey) {
  try {
    const saved = sessionStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCartForKey(storageKey, items) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const cartKey = getCartStorageKey(user);

  const [cartState, setCartState] = useState(() => ({
    key: cartKey,
    items: readCartForKey(cartKey)
  }));

  useEffect(() => {
    setCartState((prev) =>
      prev.key === cartKey ? prev : { key: cartKey, items: readCartForKey(cartKey) }
    );
  }, [cartKey]);

  const items = cartState.key === cartKey ? cartState.items : readCartForKey(cartKey);

  const updateItemsForCurrentKey = (updater) => {
    setCartState((prev) => {
      const baseItems = prev.key === cartKey ? prev.items : readCartForKey(cartKey);
      const nextItems = updater(baseItems);
      writeCartForKey(cartKey, nextItems);
      return { key: cartKey, items: nextItems };
    });
  };

  const addItem = (product, quantity = 1) => {
    updateItemsForCurrentKey((prev) => {
      const existing = prev.find((it) => it.ProductID === product.ProductID);
      if (existing) {
        return prev.map((it) =>
          it.ProductID === product.ProductID
            ? { ...it, Quantity: it.Quantity + quantity }
            : it
        );
      }
      return [
        ...prev,
        {
          ProductID: product.ProductID,
          ProductName: product.ProductName,
          ProductType: product.ProductType,
          Price: Number(product.Price),
          Unit: product.Unit,
          Quantity: quantity
        }
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      updateItemsForCurrentKey((prev) => prev.filter((it) => it.ProductID !== productId));
      return;
    }
    updateItemsForCurrentKey((prev) =>
      prev.map((it) => (it.ProductID === productId ? { ...it, Quantity: quantity } : it))
    );
  };

  const removeItem = (productId) => {
    updateItemsForCurrentKey((prev) => prev.filter((it) => it.ProductID !== productId));
  };

  const clearCart = () => updateItemsForCurrentKey(() => []);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.Price) * Number(item.Quantity), 0);
  const totalCount = items.reduce((sum, item) => sum + Number(item.Quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalCount,
        addItem,
        updateQuantity,
        removeItem,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return ctx;
}
