"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import CartDrawer from "./CartDrawer";
import { ShoppingCart } from "lucide-react";

export default function CartIcon() {
  const { cart, itemCount, refresh } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
      >
        <ShoppingCart className="w-5 h-5" />
        {itemCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-[var(--color-surface)]">
            {itemCount}
          </span>
        )}
      </button>

      {isOpen && (
        <CartDrawer 
          cart={cart} 
          onClose={() => setIsOpen(false)} 
          onRefresh={refresh}
        />
      )}
    </>
  );
}
