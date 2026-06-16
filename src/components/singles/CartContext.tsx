"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getCartAction } from "@/app/actions/cart-actions";

interface CartContextType {
  cart: any;
  itemCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Agrega de forma optimista un elemento al estado local del carrito */
  optimisticAdd: (stockItem: any, quantity: number) => void;
  /** Elimina de forma optimista un elemento del estado local del carrito */
  optimisticRemove: (cartItemId: string) => void;
  /** Actualiza de forma optimista la cantidad de un elemento del carrito */
  optimisticUpdateQty: (cartItemId: string, newQuantity: number) => void;
  /** Vacia de forma optimista todos los elementos del carrito */
  optimisticClear: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getCartAction();
      if (mountedRef.current) {
        setCart(data);
        setIsLoading(false);
      }
    } catch {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  const itemCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const optimisticAdd = useCallback((stockItem: any, quantity: number) => {
    setCart((prev: any) => {
      if (!prev) return prev;
      const existingIdx = prev.items.findIndex((i: any) => i.stockItemId === stockItem.id);
      if (existingIdx >= 0) {
        // Actualización de la cantidad de un elemento existente
        const newItems = [...prev.items];
        newItems[existingIdx] = {
          ...newItems[existingIdx],
          quantity: newItems[existingIdx].quantity + quantity,
        };
        return { ...prev, items: newItems };
      } else {
        // Adición de un nuevo elemento asignando un identificador temporal
        const tempItem = {
          id: `temp-${Date.now()}`,
          stockItemId: stockItem.id,
          quantity,
          priceAtAdd: stockItem.computedPrice?.finalPrice ?? stockItem.salePrice ?? 0,
          stockItem: {
            ...stockItem,
            scryfallCard: stockItem.scryfallCard,
          },
        };
        return { ...prev, items: [...prev.items, tempItem] };
      }
    });
  }, []);

  const optimisticRemove = useCallback((cartItemId: string) => {
    setCart((prev: any) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((i: any) => i.id !== cartItemId) };
    });
  }, []);

  const optimisticUpdateQty = useCallback((cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Se interpreta y procesa como eliminación
      setCart((prev: any) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter((i: any) => i.id !== cartItemId) };
      });
      return;
    }
    setCart((prev: any) => {
      if (!prev) return prev;
      const newItems = prev.items.map((i: any) =>
        i.id === cartItemId ? { ...i, quantity: newQuantity } : i
      );
      return { ...prev, items: newItems };
    });
  }, []);

  const optimisticClear = useCallback(() => {
    setCart((prev: any) => {
      if (!prev) return prev;
      return { ...prev, items: [] };
    });
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        refresh,
        optimisticAdd,
        optimisticRemove,
        optimisticUpdateQty,
        optimisticClear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
