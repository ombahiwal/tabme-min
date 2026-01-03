'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface TableInfo {
  id: string;
  name: string;
  number: number;
}

interface RestaurantInfo {
  id: string;
  name: string;
  currency: string;
  address?: string;
  phone?: string;
  description?: string;
  logoUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  tableInfo: TableInfo | null;
  restaurantInfo: RestaurantInfo | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setTableInfo: (table: TableInfo) => void;
  setRestaurantInfo: (restaurant: RestaurantInfo) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(current => {
      const existing = current.find(i => i.menuItemId === item.menuItemId);
      if (existing) {
        return current.map(i =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...current, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems(current => current.filter(i => i.menuItemId !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems(current =>
      current.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    );
  }, [removeItem]);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setItems(current =>
      current.map(i =>
        i.menuItemId === menuItemId ? { ...i, notes } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        tableInfo,
        restaurantInfo,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        setTableInfo,
        setRestaurantInfo,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
