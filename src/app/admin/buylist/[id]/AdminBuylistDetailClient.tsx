'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Coins, Clock, CheckCircle, XCircle, Trash2, 
  Sparkles, Save, User, Calendar, Loader2, AlertCircle, Plus, Search, Tag, Globe, Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { updateBuylistRequestAction } from '@/app/actions/buylist-actions';
import { fetchScryfallAutocompleteAction, searchScryfallLiveAction } from '@/app/actions/inventory-actions';

interface AdminBuylistDetailClientProps {
  initialRequest: any;
  defaultRate: number;
  defaultRateCredit: number;
  conditionModifiers?: Record<string, number>;
  priceBands?: any[];
}

interface EditableItem {
  id: string; // Identificador de base de datos o identificador temporal local
  scryfallCardId: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  quantity: number;
  condition: string;
  finish: string;
  language: string;
  marketPrice: number;
  buyPrice: number;
  scryfallCardData?: any; // Para cartas recién añadidas
  scryfallCard?: any; // Relación original
}

const CONDITION_LABELS: Record<string, string> = {
  NM: "M/NM - Near Mint",
  LP: "EX - Lightly Played",
  MP: "GD - Moderately Played",
  HP: "LP - Heavily Played",
  PO: "PL - Poor"
};

const LANGUAGES = [
  { code: "en", name: "Inglés (EN)" },
  { code: "es", name: "Español (ES)" },
  { code: "ja", name: "Japonés (JA)" },
  { code: "fr", name: "Francés (FR)" },
  { code: "de", name: "Alemán (DE)" },
  { code: "it", name: "Italiano (IT)" },
  { code: "pt", name: "Portugués (PT)" }
];

export default function AdminBuylistDetailClient({ 
  initialRequest, 
  defaultRate, 
  defaultRateCredit,
  conditionModifiers,
  priceBands
}: AdminBuylistDetailClientProps) {
  const router = useRouter();

  const getConditionModifier = (cond: string): number => {
    if (conditionModifiers && conditionModifiers[cond] !== undefined) {
      return conditionModifiers[cond];
    }
    if (cond === 'NM') return 1.0;
    if (cond === 'LP') return 0.90;
    if (cond === 'MP') return 0.75;
    if (cond === 'HP') return 0.50;
    if (cond === 'PO') return 0.25;
    return 1.0;
  };

  const getAppliedRate = (marketPrice: number, currentTradeType: string): number => {
    if (priceBands && priceBands.length > 0) {
      const matchingBand = priceBands.find(b => marketPrice >= b.minPrice && marketPrice <= b.maxPrice);
      if (matchingBand) {
        return currentTradeType === 'STORE_CREDIT' ? matchingBand.rateCredit : matchingBand.rateCash;
      }
    }
    return currentTradeType === 'STORE_CREDIT' ? defaultRateCredit : defaultRate;
  };
  const [items, setItems] = useState<EditableItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Método de cobro / pago
  const [tradeType, setTradeType] = useState('CASH');

  // Estado de búsqueda para añadir nuevas cartas a la valoración
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [prints, setPrints] = useState<any[]>([]);
  const [selectedPrint, setSelectedPrint] = useState<any | null>(null);
  
  // Configuración de adición para la nueva carta
  const [addQty, setAddQty] = useState(1);
  const [addCondition, setAddCondition] = useState('NM');
  const [addFinish, setAddFinish] = useState('nonfoil');
  const [addLanguage, setAddLanguage] = useState('en');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialRequest) {
      setTradeType(initialRequest.tradeType || 'CASH');
      if (initialRequest.items) {
        const mapped = initialRequest.items.map((item: any) => ({
          id: item.id,
          scryfallCardId: item.scryfallCardId,
          name: item.scryfallCard.name,
          setName: item.scryfallCard.setName,
          setCode: item.scryfallCard.setCode,
          collectorNumber: item.scryfallCard.collectorNumber,
          quantity: item.quantity,
          condition: item.condition,
          finish: item.finish,
          language: item.language,
          marketPrice: item.marketPrice,
          buyPrice: item.buyPrice,
          scryfallCard: item.scryfallCard
        }));
        setItems(mapped);
      }
    }
  }, [initialRequest]);

  // Gestión de la búsqueda con autocompletado
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetchScryfallAutocompleteAction(searchQuery);
      if (res.success) {
        setSuggestions(res.data || []);
      }
    }, 300);
  }, [searchQuery]);

  const handleSelectName = async (name: string) => {
    setSearchQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedPrint(null);
    setPrints([]);
    setError('');
    setSearching(true);

    const res = await searchScryfallLiveAction(`!"${name}"`);
    if (res.success) {
      const data = res.data || [];
      setPrints(data);
      if (data.length > 0) {
        setSelectedPrint(data[0]);
        const finishes = data[0].finishes || [];
        if (finishes.includes('nonfoil')) {
          setAddFinish('nonfoil');
        } else if (finishes.includes('foil')) {
          setAddFinish('foil');
        } else if (finishes.length > 0) {
          setAddFinish(finishes[0]);
        }
      }
    } else {
      setError('No se encontraron resultados en Scryfall.');
    }
    setSearching(false);
  };

  const getCardPrice = (card: any, cardFinish: string): number => {
    if (!card) return 0;
    const prices = card.prices || {};
    if (cardFinish === 'foil' || cardFinish === 'etched') {
      return prices.eur_foil 
        ? parseFloat(prices.eur_foil) 
        : (prices.usd_foil ? parseFloat((parseFloat(prices.usd_foil) * 0.92).toFixed(2)) : 0);
    }
    return prices.eur 
      ? parseFloat(prices.eur) 
      : (prices.usd ? parseFloat((parseFloat(prices.usd) * 0.92).toFixed(2)) : 0);
  };

  const handleToggleTradeType = (newType: string) => {
    setTradeType(newType);
    setItems(prev => prev.map(item => {
      const rate = getAppliedRate(item.marketPrice, newType);
      return {
        ...item,
        buyPrice: parseFloat((item.marketPrice * (rate / 100) * getConditionModifier(item.condition)).toFixed(2))
      };
    }));
  };

  const handleAddNewItem = () => {
    if (!selectedPrint) return;

    const marketPrice = getCardPrice(selectedPrint, addFinish);
    const rate = getAppliedRate(marketPrice, tradeType);
    const buyPrice = parseFloat((marketPrice * (rate / 100) * getConditionModifier(addCondition)).toFixed(2));
    const localId = `new_${Date.now()}`;

    const newItem: EditableItem = {
      id: localId,
      scryfallCardId: selectedPrint.id,
      name: selectedPrint.name,
      setName: selectedPrint.set_name,
      setCode: selectedPrint.set,
      collectorNumber: selectedPrint.collector_number,
      quantity: addQty,
      condition: addCondition,
      finish: addFinish,
      language: addLanguage,
      marketPrice,
      buyPrice,
      scryfallCardData: selectedPrint
    };

    setItems([...items, newItem]);
    
    setSearchQuery('');
    setPrints([]);
    setSelectedPrint(null);
    setAddQty(1);
    setAddCondition('NM');
  };

  const handleUpdateItem = (index: number, key: keyof EditableItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    
    if (key === 'condition') {
      const rate = getAppliedRate(updated[index].marketPrice, tradeType);
      updated[index].buyPrice = parseFloat((updated[index].marketPrice * (rate / 100) * getConditionModifier(value)).toFixed(2));
    }
    
    if (key === 'finish') {
      const cardRef = updated[index].scryfallCardData || updated[index].scryfallCard;
      let prices = { 
        eur: cardRef?.priceEur, 
        eur_foil: cardRef?.priceEurFoil,
        usd: cardRef?.priceUsd,
        usd_foil: cardRef?.priceUsdFoil 
      };
      if (cardRef?.prices) {
        prices = { 
          eur: cardRef.prices.eur ? parseFloat(cardRef.prices.eur) : null,
          eur_foil: cardRef.prices.eur_foil ? parseFloat(cardRef.prices.eur_foil) : null,
          usd: cardRef.prices.usd ? parseFloat(cardRef.prices.usd) : null,
          usd_foil: cardRef.prices.usd_foil ? parseFloat(cardRef.prices.usd_foil) : null
        };
      }
      
      let newMarket = 0;
      if (value === 'foil' || value === 'etched') {
        if (prices.eur_foil !== null && prices.eur_foil !== undefined) {
          newMarket = prices.eur_foil;
        } else if (prices.usd_foil !== null && prices.usd_foil !== undefined) {
          newMarket = parseFloat((prices.usd_foil * 0.92).toFixed(2));
        }
      } else {
        if (prices.eur !== null && prices.eur !== undefined) {
          newMarket = prices.eur;
        } else if (prices.usd !== null && prices.usd !== undefined) {
          newMarket = parseFloat((prices.usd * 0.92).toFixed(2));
        }
      }
      
      const rate = getAppliedRate(newMarket, tradeType);
      updated[index].marketPrice = newMarket;
      updated[index].buyPrice = parseFloat((newMarket * (rate / 100) * getConditionModifier(updated[index].condition)).toFixed(2));
    }

    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProcessRequest = async (targetStatus: 'APPROVED' | 'REJECTED') => {
    setSubmitting(true);
    setError('');

    const formattedItems = items.map(item => ({
      scryfallCardId: item.scryfallCardId,
      scryfallCardData: item.scryfallCardData, // included if new
      quantity: item.quantity,
      condition: item.condition,
      finish: item.finish,
      language: item.language,
      marketPrice: item.marketPrice,
      buyPrice: item.buyPrice
    }));

    const res = await updateBuylistRequestAction(initialRequest.id, targetStatus, formattedItems, tradeType);
    if (res.success) {
      router.push('/admin/buylist');
    } else {
      setError(res.message || 'Error al procesar la tasación.');
      setSubmitting(false);
    }
  };

  const isPending = initialRequest.status === 'PENDING';
  const totalCards = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalOfferVal = items.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    PENDING: { label: "Pendiente de revisión", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
    APPROVED: { label: "Aprobada e Ingresada al Inventario", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle },
    REJECTED: { label: "Rechazada", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
  };
  const statusInfo = statusMap[initialRequest.status] || { label: initialRequest.status, color: "text-slate-400 bg-slate-800", icon: Clock };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/buylist">
          <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Detalle de Tasación #{initialRequest.id.substring(0, 8).toUpperCase()}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Revisa los detalles físicos de las cartas, ajusta el precio ofrecido y valida el ingreso en inventario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Tabla interactiva principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Panel de adición de cartas para el administrador */}
          {isPending && (
            <Card className="border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Añadir carta extra a la tasación
              </CardTitle>
              
              <div className="relative">
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Buscar carta para añadir..."
                    className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
                  />
                  {searching && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        onClick={() => handleSelectName(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPrint && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-850 animate-in fade-in duration-200">
                  <div className="text-xs space-y-0.5">
                    <p className="text-white font-bold truncate">{selectedPrint.name}</p>
                    <p className="text-slate-500 uppercase tracking-wider text-[10px]">{selectedPrint.set} - {selectedPrint.set_name}</p>
                  </div>
                  
                  <select 
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                    value={addCondition}
                    onChange={(e) => setAddCondition(e.target.value)}
                  >
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>

                  <select 
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                    value={addFinish}
                    onChange={(e) => setAddFinish(e.target.value)}
                  >
                    {(selectedPrint.finishes || ["nonfoil", "foil"]).map((f: string) => (
                      <option key={f} value={f}>
                        {f === 'foil' ? 'Foil' : f === 'etched' ? 'Etched' : 'Normal'}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 items-center justify-between">
                    <input 
                      type="number"
                      min="1"
                      className="w-12 bg-slate-900 border border-slate-800 rounded-xl py-1.5 text-center text-xs text-white"
                      value={addQty}
                      onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <Button variant="primary" size="sm" onClick={handleAddNewItem}>
                      Añadir
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Tabla del listado de cartas */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/20">
              <h3 className="font-bold text-white">Cartas Incluidas</h3>
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p>No hay cartas en esta tasación.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                      <th className="px-6 py-3">Carta</th>
                      <th className="px-6 py-3">Estado/Condición</th>
                      <th className="px-6 py-3">Acabado / Idioma</th>
                      <th className="px-6 py-3 text-center">Cantidad</th>
                      <th className="px-6 py-3 text-right">Mercado</th>
                      <th className="px-6 py-3 text-right">Compra</th>
                      {isPending && <th className="px-6 py-3 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/10 transition-all">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white leading-tight">{item.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{item.setCode} ({item.setName})</div>
                        </td>
                        <td className="px-6 py-4">
                          {isPending ? (
                            <select 
                              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                              value={item.condition}
                              onChange={(e) => handleUpdateItem(idx, 'condition', e.target.value)}
                            >
                              {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              {CONDITION_LABELS[item.condition] || item.condition}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 space-y-0.5">
                          <div>
                            {isPending ? (
                              <select 
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                value={item.finish}
                                onChange={(e) => handleUpdateItem(idx, 'finish', e.target.value)}
                              >
                                <option value="nonfoil">Normal</option>
                                <option value="foil">Foil</option>
                                <option value="etched">Etched</option>
                              </select>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                {item.finish === 'foil' ? 'Foil' : item.finish === 'etched' ? 'Etched' : 'Normal'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold px-1">{item.language}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPending ? (
                            <div className="flex items-center justify-center gap-1.5 max-w-[100px] mx-auto">
                              <button 
                                className="w-6 h-6 hover:bg-slate-800 rounded text-slate-400 flex items-center justify-center font-bold"
                                onClick={() => handleUpdateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                              >
                                -
                              </button>
                              <span className="text-sm font-bold text-white min-w-[15px]">{item.quantity}</span>
                              <button 
                                className="w-6 h-6 hover:bg-slate-800 rounded text-slate-400 flex items-center justify-center font-bold"
                                onClick={() => handleUpdateItem(idx, 'quantity', item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-white">{item.quantity}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          €{item.marketPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isPending ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-slate-500 text-xs">€</span>
                              <input 
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.buyPrice}
                                onChange={(e) => handleUpdateItem(idx, 'buyPrice', parseFloat(e.target.value) || 0)}
                                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs text-emerald-400 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          ) : (
                            <span className="text-emerald-400 font-bold font-mono">€{item.buyPrice.toFixed(2)}</span>
                          )}
                        </td>
                        {isPending && (
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Lado derecho: Información del jugador, resumen y botones de acción */}
        <div className="space-y-6">
          {/* Ficha de información del jugador y de la solicitud */}
          <Card className="border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" /> Información del Jugador
            </CardTitle>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center bg-slate-950/20 p-2.5 rounded-xl border border-slate-850">
                <div>
                  <p className="text-white font-bold leading-tight">{initialRequest.user.name}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{initialRequest.user.email}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Creado el:</span>
                <span className="text-white">
                  {new Date(initialRequest.createdAt).toLocaleDateString("es-ES", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-slate-500" /> Tasa Aplicada:</span>
                <span className="text-white font-bold">{initialRequest.defaultRate}%</span>
              </div>
            </div>
          </Card>

          {/* Importes totales y Acciones */}
          <Card className="border border-slate-800/80 bg-slate-900/40 p-6 space-y-6">
            <CardTitle className="text-base">Resumen de Decisión</CardTitle>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center px-1">
                <span className="text-slate-400">Estado de Solicitud:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {initialRequest.status}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-850 px-1">
                <span className="text-slate-400">Método de Pago:</span>
                <span className={`text-xs font-bold ${tradeType === 'STORE_CREDIT' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {tradeType === 'STORE_CREDIT' ? 'Crédito de Tienda' : 'Efectivo (Cash)'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-850 px-1">
                <span className="text-slate-400">Total Cartas:</span>
                <span className="text-white font-bold">{totalCards}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-850 px-1 text-base">
                <span className="font-bold text-white">Importe Ofrecido:</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">
                  €{totalOfferVal.toFixed(2)}
                </span>
              </div>
            </div>

            {isPending ? (
              <div className="space-y-3 pt-4 border-t border-slate-850">
                {/* Selector de método de pago */}
                <div className="space-y-1.5 pb-2">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Método de Pago Decidido</label>
                  <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleTradeType('CASH')}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                        tradeType === 'CASH'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Efectivo ({defaultRate}%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTradeType('STORE_CREDIT')}
                      className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                        tradeType === 'STORE_CREDIT'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Crédito ({defaultRateCredit}%)
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</p>
                )}
                
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/40 text-[10px] text-slate-500 flex gap-2">
                  <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <span>
                    {tradeType === 'STORE_CREDIT' 
                      ? `Al aprobar, se añadirán €${totalOfferVal.toFixed(2)} de saldo a la cartera del jugador y las cartas al inventario.`
                      : 'Al aprobar, se ingresarán las cartas al inventario. El jugador deberá cobrar el efectivo de forma directa.'}
                  </span>
                </div>

                <Button 
                  variant="success" 
                  className="w-full py-3.5 font-bold rounded-2xl flex items-center justify-center gap-1.5"
                  disabled={submitting || items.length === 0}
                  onClick={() => handleProcessRequest('APPROVED')}
                >
                  {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CheckCircle className="w-4.5 h-4.5" />}
                  Aprobar e Ingresar Stock
                </Button>
                
                <button 
                  disabled={submitting}
                  onClick={() => handleProcessRequest('REJECTED')}
                  className="w-full py-3 hover:bg-rose-500/10 text-rose-500 font-bold text-sm rounded-2xl border border-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4.5 h-4.5" />
                  Rechazar Tasación
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-850 bg-slate-950/20 p-4 rounded-2xl border border-slate-850 text-center text-xs text-slate-500">
                {tradeType === 'STORE_CREDIT' 
                  ? 'Esta tasación ha sido aprobada. El crédito ha sido transferido al saldo del jugador y las unidades se sumaron al stock.'
                  : 'Esta tasación ya ha sido procesada. Las unidades se han sumado al stock.'}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
