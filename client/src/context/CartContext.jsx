import React, { createContext, useContext, useEffect, useState } from 'react';

const CART_STORAGE_KEY = 'seculicense_cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
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
      setItems((prev) => prev.filter((it) => it.ProductID !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.ProductID === productId ? { ...it, Quantity: quantity } : it))
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.ProductID !== productId));
  };

  const clearCart = () => setItems([]);

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
