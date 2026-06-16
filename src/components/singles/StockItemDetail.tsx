"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateStockItemAction, deleteStockItemAction, searchScryfallLiveAction } from "@/app/actions/inventory-actions";
import { addToCartAction } from "@/app/actions/cart-actions";
import { useCart } from "./CartContext";
import PriceChart from "./PriceChart";
import StockSubscription from "./StockSubscription";
import { getCardPriceHistory } from "@/app/actions/chart-actions";
import ConditionTag from "./ConditionTag";
import { PricePreview } from "./PricePreview";

export default function StockItemDetail({ item, isAdmin, onClose }: { 
  item: any, 
  isAdmin: boolean, 
  onClose: () => void 
}) {
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Variables de estado de edición para la administración
  const [quantity, setQuantity] = useState(item.quantity);
  const [salePrice, setSalePrice] = useState(item.salePrice?.toString() || "");
  const [priceMode, setPriceMode] = useState(item.priceMode);
  
  const [condition, setCondition] = useState(item.condition);
  const [finish, setFinish] = useState(item.finish);
  const [language, setLanguage] = useState(item.language);
  
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [prints, setPrints] = useState<any[]>([]);
  const [searchingPrints, setSearchingPrints] = useState(false);
  const [showEditions, setShowEditions] = useState(false);

  // Variables de estado del carrito para el jugador
  const [cartQty, setCartQty] = useState(1);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/singles/${item.id}`)
      .then(res => res.json())
      .then(data => {
        setRelated(data.relatedItems || []);
        setLoading(false);
      });

    getCardPriceHistory(item.scryfallCardId).then(res => {
      if (res.success) setPriceHistory(res.data || []);
    });
  }, [item.id, item.scryfallCardId]);

  const handleSave = async () => {
    const res = await updateStockItemAction(item.id, {
      quantity: parseInt(quantity as any),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      priceMode,
      condition,
      finish,
      language,
      scryfallCardData: selectedCard
    });
    if (res.success) {
      alert("Guardado correctamente");
      onClose();
    } else {
      alert("Error: " + res.message);
    }
  };

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de eliminar esta variante del stock?")) {
      const res = await deleteStockItemAction(item.id);
      if (res.success) onClose();
    }
  };

  const { optimisticAdd, refresh } = useCart();

  const handleAddToCart = async () => {
    // Actualización optimista: se modifica la UI del carrito de forma instantánea
    optimisticAdd(item, cartQty);
    onClose();
    // Sincronización en segundo plano con el servidor
    const res = await addToCartAction(item.id, cartQty);
    if (!res.success) {
      // Reversión del estado optimista en caso de fallo mediante recarga desde el servidor
      alert("Error: " + res.message);
      await refresh();
    } else {
      // Sincronización para obtener los identificadores de elemento del carrito generados por el servidor
      await refresh();
    }
  };

  const loadPrints = async () => {
    setShowEditions(true);
    if (prints.length > 0) return;
    setSearchingPrints(true);
    // Buscamos otras impresiones de la carta con el nombre exacto
    const res = await searchScryfallLiveAction(`!"${item.scryfallCard.name}"`);
    if (res.success) {
      setPrints(res.data);
    } else {
      alert("Error al cargar ediciones: " + res.message);
    }
    setSearchingPrints(false);
  };

  const card = selectedCard || item.scryfallCard;
  let imageUris: any = {};
  if (selectedCard) {
    imageUris = card.image_uris || card.card_faces?.[0]?.image_uris || {};
  } else {
    try { imageUris = JSON.parse(card.imageUris); } catch(e){}
  }
  const imageUrl = imageUris.normal || imageUris.large || imageUris.small || "";
  const cardName = card.name;
  const setName = selectedCard ? card.set_name : card.setName;
  const setCode = selectedCard ? card.set : card.setCode;

  const isFoilish = finish === 'foil' || finish === 'etched';
  let marketPriceNum: number | null = null;
  if (selectedCard) {
    const prices = selectedCard.prices || {};
    const eurPrice = isFoilish ? prices.eur_foil : prices.eur;
    if (eurPrice !== null && eurPrice !== undefined) {
      marketPriceNum = parseFloat(eurPrice);
    } else {
      const usdPrice = isFoilish ? prices.usd_foil : prices.usd;
      if (usdPrice !== null && usdPrice !== undefined) {
        marketPriceNum = parseFloat((parseFloat(usdPrice) * 0.92).toFixed(2));
      }
    }
  } else {
    const dbPriceEur = isFoilish ? item.scryfallCard.priceEurFoil : item.scryfallCard.priceEur;
    if (dbPriceEur !== null && dbPriceEur !== undefined) {
      marketPriceNum = typeof dbPriceEur === 'string' ? parseFloat(dbPriceEur) : dbPriceEur;
    } else {
      const dbPriceUsd = isFoilish ? item.scryfallCard.priceUsdFoil : item.scryfallCard.priceUsd;
      if (dbPriceUsd !== null && dbPriceUsd !== undefined) {
        const usdVal = typeof dbPriceUsd === 'string' ? parseFloat(dbPriceUsd) : dbPriceUsd;
        marketPriceNum = parseFloat((usdVal * 0.92).toFixed(2));
      }
    }
  }
  const defaultPriceLabel = marketPriceNum !== null ? `Auto (€${marketPriceNum.toFixed(2)})` : "Manual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex flex-col md:flex-row p-6 gap-8">
          <div className="w-full md:w-1/2 flex flex-col justify-start">
            <div className="flex justify-center mb-4">
              {imageUrl ? (
                <img src={imageUrl} alt={cardName} className="max-w-full h-auto max-h-[60vh] rounded-xl object-contain shadow-lg transition-all" />
              ) : (
                <div className="w-64 h-96 bg-gray-800 rounded-xl flex items-center justify-center text-gray-500">Sin imagen</div>
              )}
            </div>

            <div className="mt-4">
              <PriceChart data={priceHistory} />
            </div>


            {isAdmin && showEditions && (
              <div className="bg-gray-800 rounded-lg p-3 border border-indigo-500/30 overflow-y-auto max-h-[25vh]">
                <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase">Seleccionar Edición</h4>
                {searchingPrints ? (
                  <p className="text-xs text-gray-500">Buscando ediciones...</p>
                ) : prints.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {prints.map((p) => (
                      <div 
                        key={p.id} 
                        className={`p-2 rounded text-xs cursor-pointer border ${selectedCard?.id === p.id || (!selectedCard && item.scryfallCard.id === p.id) ? 'bg-indigo-900/40 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                        onClick={() => {
                          setSelectedCard(p);
                          setSalePrice("");
                        }}
                      >
                        <div className="font-bold truncate" title={p.set_name}>{p.set_name}</div>
                        <div>({p.set.toUpperCase()})</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No hay otras ediciones.</p>
                )}
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2 flex flex-col space-y-6">
            <div className="pr-8">
              <h2 className="text-3xl font-bold text-white">{cardName}</h2>
              <p className="text-gray-400 text-lg mt-1">{setName} ({setCode.toUpperCase()})</p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
                <ConditionTag condition={condition} className="mt-1" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Acabado</p>
                <p className="text-white font-medium capitalize">{finish}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Idioma</p>
                <p className="text-white font-medium uppercase">{language}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Stock Disponible</p>
                <p className="text-white font-medium">{item.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Precio Mercado</p>
                <p className="text-green-400 font-medium">
                  {marketPriceNum !== null ? `€${marketPriceNum.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Precio Venta</p>
                <div className="mt-1">
                  {item.computedPrice ? (
                      <PricePreview 
                        originalPrice={item.computedPrice.originalPrice}
                        finalPrice={item.computedPrice.finalPrice}
                        condition={item.condition}
                        conditionMultiplier={item.computedPrice.conditionMultiplier}
                        pricingRule={item.computedPrice.pricingRule}
                        flashSale={item.computedPrice.flashSale}
                        className="text-xl"
                      />
                    ) : (
                      <span className="text-[var(--color-indigo-accent)] font-bold text-xl">
                        {item.salePrice ? `€${item.salePrice.toFixed(2)}` : 'Manual'}
                      </span>
                    )}
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-4 p-4 border border-indigo-500/30 rounded-lg bg-indigo-900/10">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white">Editar Variante</h3>
                  <button onClick={loadPrints} className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium">
                    Cambiar Edición
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Idioma</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="en">Inglés (EN)</option>
                      <option value="es">Español (ES)</option>
                      <option value="ja">Japonés (JA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Estado</label>
                    <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="M">Mint (M)</option>
                      <option value="NM">Near Mint (NM)</option>
                      <option value="EX">Excellent (EX)</option>
                      <option value="GD">Good (GD)</option>
                      <option value="LP">Lightly Played (LP)</option>
                      <option value="PL">Played (PL)</option>
                      <option value="PO">Poor (PO)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Acabado</label>
                    <select value={finish} onChange={e => {
                      setFinish(e.target.value);
                      setSalePrice("");
                    }} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none">
                      <option value="nonfoil">Non-foil</option>
                      <option value="foil">Foil</option>
                      <option value="etched">Etched</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                    <input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Precio Venta (€)</label>
                    <input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder={defaultPriceLabel} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="primary" className="flex-1" onClick={handleSave}>Guardar Cambios</Button>
                  <Button variant="danger" className="flex-none bg-red-600 hover:bg-red-700 text-white px-4 border-0" onClick={handleDelete}>Eliminar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 border border-gray-800 rounded-lg bg-gray-900">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Cantidad:</span>
                  <input type="number" min="1" max={item.quantity} value={cartQty} onChange={e => setCartQty(parseInt(e.target.value) || 1)} className="w-16 bg-gray-800 border border-gray-700 rounded p-2 text-white text-center focus:border-indigo-500 focus:outline-none" />
                </div>
                <Button variant="primary" className="flex-1 py-3" onClick={handleAddToCart} disabled={item.quantity < 1}>
                  {item.quantity < 1 ? "Agotado" : "Añadir al carrito"}
                </Button>
              </div>
            )}

            {!isAdmin && item.quantity < 1 && (
              <StockSubscription 
                oracleId={item.scryfallCard.oracleId} 
                scryfallCardId={item.scryfallCard.id} 
                cardName={cardName} 
              />
            )}

            {!loading && related.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-4">
                <h3 className="font-bold text-white text-sm mb-3">Otras variantes en stock</h3>
                <div className="space-y-2">
                  {related.map((rel: any) => (
                    <div key={rel.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg text-sm border border-gray-700/50">
                      <div>
                        <span className="text-gray-300 font-medium">{rel.scryfallCard.setName}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <ConditionTag condition={rel.condition} short />
                          <span className="text-gray-500 text-xs uppercase">• {rel.finish} • {rel.language}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {rel.computedPrice ? (
                            <PricePreview 
                              originalPrice={rel.computedPrice.originalPrice}
                              finalPrice={rel.computedPrice.finalPrice}
                              condition={rel.condition}
                              conditionMultiplier={rel.computedPrice.conditionMultiplier}
                              pricingRule={rel.computedPrice.pricingRule}
                              flashSale={rel.computedPrice.flashSale}
                            />
                          ) : (
                            <span className="text-[var(--color-indigo-accent)] font-bold">{rel.salePrice ? `€${rel.salePrice}` : 'N/A'}</span>
                          )}
                        <span className="text-gray-500 ml-3 text-xs">Qty: {rel.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
