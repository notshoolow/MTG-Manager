"use client";
 
import { useState } from "react";
import StockItemDetail from "./StockItemDetail";
import ConditionTag from "./ConditionTag";
import Link from "next/link";
import { PricePreview } from "./PricePreview";
import { Button } from "@/components/ui/Button";
import { createFlashSaleAction, bulkDeleteStockItemsAction } from "@/app/actions/pricing-actions";
 
export default function StockGrid({ items, mode, isAdmin, initialCardId }: { 
  items: any[], 
  mode: 'table' | 'grid', 
  isAdmin: boolean,
  initialCardId?: string
}) {
  const [selectedItem, setSelectedItem] = useState<any | null>(() => {
    if (initialCardId) {
      return items.find(item => item.scryfallCardId === initialCardId) || null;
    }
    return null;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
 
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
 
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };
 
  return (
    <>
      {items.length === 0 ? (
      <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center space-y-2">
          <p className="text-gray-400">No hay cartas que coincidan con los filtros.</p>
          {!isAdmin && (
            <p className="text-gray-600 text-sm">
              ¿Buscas una carta específica?{" "}
              <Link href="/player/singles/alerts" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
                Crea una alerta de stock
              </Link>
              {" "}y te avisamos cuando llegue.
            </p>
          )}
        </div>
      ) : mode === 'table' ? (
        <div className="overflow-x-auto bg-gray-900 rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                {isAdmin && (
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-700 bg-gray-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3">Carta</th>
                <th className="p-3">Edición</th>
                <th className="p-3">Idioma</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acabado</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Precio Venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map(item => {
                const card = item.scryfallCard;
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr 
                    key={item.id} 
                    className={`text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-950/20' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    {isAdmin && (
                      <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-700 bg-gray-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-3 font-medium text-white">{card.name}</td>
                    <td className="p-3 uppercase text-xs">{card.setCode}</td>
                    <td className="p-3 uppercase">{item.language}</td>
                    <td className="p-3">
                      <ConditionTag condition={item.condition} short />
                    </td>
                    <td className="p-3 capitalize">{item.finish}</td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">
                      {item.computedPrice ? (
                        <PricePreview 
                          originalPrice={item.computedPrice.originalPrice}
                          finalPrice={item.computedPrice.finalPrice}
                          condition={item.condition}
                          conditionMultiplier={item.computedPrice.conditionMultiplier}
                          pricingRule={item.computedPrice.pricingRule}
                          flashSale={item.computedPrice.flashSale}
                        />
                      ) : (
                        <span className="font-bold text-[var(--color-indigo-accent)]">
                          {item.salePrice ? `€${item.salePrice.toFixed(2)}` : (
                            (() => {
                              const isFoilish = item.finish === 'foil' || item.finish === 'etched';
                              const mp = isFoilish ? card.priceEurFoil : card.priceEur;
                              if (mp !== null && mp !== undefined) return `€${mp.toFixed(2)}`;
                              const usd = isFoilish ? card.priceUsdFoil : card.priceUsd;
                              if (usd !== null && usd !== undefined) return `€${(usd * 0.92).toFixed(2)}`;
                              return 'N/A';
                            })()
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-6">
          {items.map((item) => {
            const card = item.scryfallCard;
            let imageUris: any = {};
            try { imageUris = JSON.parse(card.imageUris); } catch(e){}
            const imageUrl = imageUris.normal || imageUris.small || "";
            const isSelected = selectedIds.includes(item.id);
            
            return (
              <div 
                key={item.id} 
                className={`bg-gray-900 border rounded-xl p-3 flex flex-col hover:border-[var(--color-indigo-accent)]/50 transition-colors cursor-pointer group relative ${
                  isSelected ? 'border-indigo-500 bg-indigo-950/10 shadow-[0_0_10px_rgba(99,102,241,0.15)]' : 'border-gray-800'
                }`}
                onClick={() => setSelectedItem(item)}
              >
                {isAdmin && (
                  <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-gray-700 bg-gray-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 shadow-md"
                    />
                  </div>
                )}
                
                <div className="w-full aspect-[2.5/3.5] bg-gray-950 rounded flex items-center justify-center overflow-hidden mb-3 border border-gray-800 shadow-inner group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-shadow relative">
                  {imageUrl ? (
                    <img src={imageUrl} alt={card.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 text-xs">No Image</span>
                  )}
                  {item.quantity < 1 && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-[1px] gap-2">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Agotado</span>
                      <Link
                        href="/player/singles/alerts"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        🔔 Crear alerta
                      </Link>
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-white leading-tight truncate text-sm" title={card.name}>{card.name}</h3>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{card.setName} ({card.setCode})</p>
                
                <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                  <ConditionTag condition={item.condition} short />
                  <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 border border-gray-700 uppercase">
                    {item.language}
                  </span>
                  {item.finish === "foil" && (
                      <span className="px-1.5 py-0.5 bg-amber-900/30 text-amber-500 border border-amber-900/50 rounded">Foil</span>
                  )}
                  <span className="text-gray-400 ml-auto flex items-center">Qty: {item.quantity}</span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
                  <div>
                    {item.computedPrice ? (
                        <PricePreview 
                          originalPrice={item.computedPrice.originalPrice}
                          finalPrice={item.computedPrice.finalPrice}
                          condition={item.condition}
                          conditionMultiplier={item.computedPrice.conditionMultiplier}
                          pricingRule={item.computedPrice.pricingRule}
                          flashSale={item.computedPrice.flashSale}
                        />
                      ) : (
                        <span className="font-black text-sm text-[var(--color-indigo-accent)]">
                          {item.salePrice ? `€${item.salePrice.toFixed(2)}` : (
                            (() => {
                              const isFoilish = item.finish === 'foil' || item.finish === 'etched';
                              const mp = isFoilish ? card.priceEurFoil : card.priceEur;
                              if (mp !== null && mp !== undefined) return `€${mp.toFixed(2)}`;
                              const usd = isFoilish ? card.priceUsdFoil : card.priceUsd;
                              if (usd !== null && usd !== undefined) return `€${(usd * 0.92).toFixed(2)}`;
                              return 'N/A';
                            })()
                          )}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
 
      {isAdmin && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between max-w-2xl w-[90%] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-full">{selectedIds.length}</span>
            <span className="text-sm font-medium text-slate-300">seleccionados</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary"
              onClick={() => {
                const name = prompt("Nombre de la venta flash:");
                if (!name) return;
                const discountStr = prompt("Descuento (ej: 20 para 20%):");
                if (!discountStr) return;
                const discount = parseFloat(discountStr) / 100;
                if (isNaN(discount) || discount <= 0 || discount >= 1) {
                  alert("Descuento inválido.");
                  return;
                }
                const durationStr = prompt("Duración en días (ej: 7):");
                if (!durationStr) return;
                const days = parseInt(durationStr);
                if (isNaN(days) || days <= 0) return;
                
                const startsAt = new Date();
                const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);
                
                setBulkLoading(true);
                createFlashSaleAction(name, discount, startsAt, expiresAt, selectedIds)
                  .then(res => {
                    if (res.success) {
                      alert("¡Venta Flash creada con éxito!");
                      setSelectedIds([]);
                    } else {
                      alert("Error: " + res.message);
                    }
                  })
                  .finally(() => setBulkLoading(false));
              }}
              disabled={bulkLoading}
              className="text-xs h-9 bg-slate-800 hover:bg-slate-700 border-slate-700"
            >
              Crear Venta Flash
            </Button>
            
            <Button 
              variant="danger"
              onClick={async () => {
                if (confirm(`¿Estás seguro de eliminar ${selectedIds.length} variantes del inventario?`)) {
                  setBulkLoading(true);
                  const res = await bulkDeleteStockItemsAction(selectedIds);
                  if (res.success) {
                    alert("Variantes eliminadas.");
                    setSelectedIds([]);
                  } else {
                    alert("Error: " + res.message);
                  }
                  setBulkLoading(false);
                }
              }}
              disabled={bulkLoading}
              className="text-xs h-9 bg-red-950 hover:bg-red-900 border-red-900"
            >
              Eliminar Selección
            </Button>
            
            <button 
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs px-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
 
      {selectedItem && (
        <StockItemDetail 
          item={selectedItem} 
          isAdmin={isAdmin} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </>
  );
}
