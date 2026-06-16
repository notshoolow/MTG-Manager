"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateCartItemAction, checkoutAction, clearCartAction } from "@/app/actions/cart-actions";
import { useCart } from "./CartContext";
import { X, Trash2, CreditCard, ShoppingCart } from "lucide-react";

export default function CartDrawer({ cart, onClose, onRefresh }: { cart: any, onClose: () => void, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const { optimisticUpdateQty, optimisticClear, refresh } = useCart();

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    // Actualización optimista: se modifica la UI de forma instantánea
    optimisticUpdateQty(itemId, newQty);
    // Sincronización en segundo plano con el servidor
    await updateCartItemAction(itemId, newQty);
    await refresh();
  };

  const handleClear = async () => {
    if (confirm("¿Vaciar el carrito?")) {
      optimisticClear();
      await clearCartAction();
      await refresh();
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    const res = await checkoutAction();
    if (res.success) {
      optimisticClear();
      alert("¡Pedido realizado con éxito!");
      onClose();
    } else {
      alert("Error: " + res.message);
      await refresh();
    }
    setLoading(false);
  };

  const items = cart?.items || [];
  const subtotal = items.reduce((acc: number, item: any) => acc + (item.quantity * (item.stockItem.salePrice || 0)), 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-gray-900 h-full shadow-2xl flex flex-col border-l border-gray-800 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Carrito de Compra
            <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">{items.length} items</span>
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            items.map((item: any) => {
              const stock = item.stockItem;
              const card = stock.scryfallCard;
              let imageUris: any = {};
              try { imageUris = JSON.parse(card.imageUris); } catch(e){}
              const imageUrl = imageUris.normal || imageUris.small || "";

              return (
                <div key={item.id} className="flex gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700/50 relative group">
                  <div className="w-16 h-24 bg-gray-950 rounded flex-shrink-0 border border-gray-700 overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-gray-500 text-center block mt-8">No img</span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{card.name}</h4>
                    <p className="text-xs text-gray-400 truncate">{card.setName}</p>
                    <div className="flex gap-1 mt-1">
                      <span className="text-[10px] px-1 bg-gray-700 rounded text-gray-300">{stock.condition}</span>
                      <span className="text-[10px] px-1 bg-gray-700 rounded text-gray-300 uppercase">{stock.language}</span>
                      {stock.finish === "foil" && <span className="text-[10px] px-1 bg-amber-900/40 text-amber-500 rounded">Foil</span>}
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <p className="text-[var(--color-indigo-accent)] font-bold text-sm">
                        €{stock.salePrice?.toFixed(2) || '0.00'}
                      </p>
                      
                      <div className="flex items-center gap-2 bg-gray-900 rounded border border-gray-700 p-0.5">
                        <button 
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50"
                          onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                          disabled={loading}
                        >
                          -
                        </button>
                        <span className="text-white text-xs w-4 text-center">{item.quantity}</span>
                        <button 
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50"
                          onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                          disabled={loading || item.quantity >= stock.quantity}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleUpdateQty(item.id, 0)}
                    className="absolute -top-2 -right-2 bg-red-600/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    disabled={loading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-gray-950 border-t border-gray-800 space-y-4">
            <div className="flex justify-between items-center text-gray-300">
              <span>Subtotal</span>
              <span className="font-bold text-white text-lg">€{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="primary" 
                className="w-full py-4 text-lg font-bold flex justify-center items-center gap-2"
                onClick={handleCheckout}
                disabled={loading}
              >
                <CreditCard className="w-5 h-5" />
                Confirmar Pedido
              </Button>
              <button 
                className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                onClick={handleClear}
                disabled={loading}
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
