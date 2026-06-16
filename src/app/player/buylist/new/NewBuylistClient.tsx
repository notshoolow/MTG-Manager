'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, Coins, ArrowLeft, Loader2, Trash2, Plus, 
  Sparkles, AlertCircle, Info, Package, Globe, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { fetchScryfallAutocompleteAction, searchScryfallLiveAction } from '@/app/actions/inventory-actions';
import { createBuylistRequestAction } from '@/app/actions/buylist-actions';

interface NewBuylistClientProps {
  defaultRate: number;
  defaultRateCredit: number;
  initialConditionModifiers?: Record<string, number>;
  initialPriceBands?: any[];
}

interface DraftItem {
  id: string; // Identificador local único
  scryfallCardData: any;
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

export default function NewBuylistClient({ 
  defaultRate, 
  defaultRateCredit, 
  initialConditionModifiers,
  initialPriceBands
}: NewBuylistClientProps) {
  const router = useRouter();

  const getConditionModifier = (cond: string): number => {
    if (initialConditionModifiers && initialConditionModifiers[cond] !== undefined) {
      return initialConditionModifiers[cond];
    }
    if (cond === 'NM') return 1.0;
    if (cond === 'LP') return 0.90;
    if (cond === 'MP') return 0.75;
    if (cond === 'HP') return 0.50;
    if (cond === 'PO') return 0.25;
    return 1.0;
  };

  const getAppliedRate = (marketPrice: number, currentTradeType: string): number => {
    if (initialPriceBands && initialPriceBands.length > 0) {
      const matchingBand = initialPriceBands.find(b => marketPrice >= b.minPrice && marketPrice <= b.maxPrice);
      if (matchingBand) {
        return currentTradeType === 'STORE_CREDIT' ? matchingBand.rateCredit : matchingBand.rateCash;
      }
    }
    return currentTradeType === 'STORE_CREDIT' ? defaultRateCredit : defaultRate;
  };
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [prints, setPrints] = useState<any[]>([]);
  const [selectedPrint, setSelectedPrint] = useState<any | null>(null);

  // Configuración de la selección de carta actual
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('NM');
  const [finish, setFinish] = useState('nonfoil');
  const [language, setLanguage] = useState('en');

  // Método de cobro/transacción: CASH (efectivo) o STORE_CREDIT (crédito de tienda)
  const [tradeType, setTradeType] = useState('CASH');

  // Listado de artículos en el borrador de solicitud de compra
  const [items, setItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gestión del autocompletado a medida que el usuario escribe
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetchScryfallAutocompleteAction(query);
      if (res.success) {
        setSuggestions(res.data || []);
      }
    }, 300);
  }, [query]);

  const handleSelectName = async (name: string) => {
    setQuery(name);
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
          setFinish('nonfoil');
        } else if (finishes.includes('foil')) {
          setFinish('foil');
        } else if (finishes.length > 0) {
          setFinish(finishes[0]);
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

  const handleAddItem = () => {
    if (!selectedPrint) return;

    const marketPrice = getCardPrice(selectedPrint, finish);
    const appliedRate = getAppliedRate(marketPrice, tradeType);
    const buyPrice = parseFloat((marketPrice * (appliedRate / 100) * getConditionModifier(condition)).toFixed(2));

    const id = `${selectedPrint.id}_${finish}_${condition}_${language}`;

    const existingIndex = items.findIndex(item => item.id === id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += quantity;
      setItems(updated);
    } else {
      const newItem: DraftItem = {
        id,
        scryfallCardData: selectedPrint,
        name: selectedPrint.name,
        setName: selectedPrint.set_name,
        setCode: selectedPrint.set,
        collectorNumber: selectedPrint.collector_number,
        quantity,
        condition,
        finish,
        language,
        marketPrice,
        buyPrice
      };
      setItems([...items, newItem]);
    }

    setQuery('');
    setPrints([]);
    setSelectedPrint(null);
    setQuantity(1);
    setCondition('NM');
    setLanguage('en');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError('');

    const formattedItems = items.map(item => ({
      scryfallCardData: item.scryfallCardData,
      scryfallCardId: item.scryfallCardData.id,
      quantity: item.quantity,
      condition: item.condition,
      finish: item.finish,
      language: item.language,
      marketPrice: item.marketPrice,
      buyPrice: item.buyPrice
    }));

    const res = await createBuylistRequestAction(formattedItems, tradeType);
    if (res.success) {
      router.push('/player/buylist');
    } else {
      setError(res.message || 'Error al enviar la tasación. Inténtalo de nuevo.');
      setSubmitting(false);
    }
  };

  const totalMarketVal = items.reduce((acc, item) => acc + (item.marketPrice * item.quantity), 0);
  const totalOfferVal = items.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);
  const currentRate = tradeType === 'STORE_CREDIT' ? defaultRateCredit : defaultRate;
  const selectedPrintFinishes = selectedPrint ? (selectedPrint.finishes || ["nonfoil", "foil"]) : [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/player/buylist">
          <button className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Crear Nueva Tasación
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Añade las cartas que quieres vender. La valoración se calcula en base al método de cobro elegido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Izquierda/Centro: Selector y búsqueda */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-800/80 bg-slate-900/40 p-6 space-y-6">
            <CardTitle>Buscador de Cartas</CardTitle>
            
            {/* Campo de búsqueda */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 focus-within:border-indigo-500 transition-colors">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Escribe el nombre de la carta que quieres vender..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                />
                {searching && <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin flex-shrink-0" />}
              </div>

              {/* Listado de sugerencias de autocompletado */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      onClick={() => handleSelectName(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Configuración y opciones de impresión para la carta seleccionada */}
            {selectedPrint && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-800/80 animate-in fade-in duration-300">
                {/* Selector de impresión / edición */}
                <div className="md:col-span-4 flex flex-col items-center gap-4 text-center">
                  <div className="w-40 aspect-[5/7] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col justify-between p-1.5">
                    {selectedPrint.image_uris?.normal || selectedPrint.card_faces?.[0]?.image_uris?.normal ? (
                      <img 
                        src={selectedPrint.image_uris?.normal || selectedPrint.card_faces?.[0]?.image_uris?.normal} 
                        alt={selectedPrint.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Sin Imagen</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm leading-tight">{selectedPrint.name}</h4>
                    <p className="text-slate-400 text-xs mt-1 truncate max-w-[180px]">{selectedPrint.set_name}</p>
                    <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider">{selectedPrint.set}</p>
                  </div>
                </div>

                {/* Controles de configuración de la carta */}
                <div className="md:col-span-8 space-y-4">
                  {/* Selección de versión / impresión */}
                  {prints.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Edición / Versión</label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={selectedPrint.id}
                        onChange={(e) => {
                          const found = prints.find(p => p.id === e.target.value);
                          if (found) {
                            setSelectedPrint(found);
                            if (found.finishes && found.finishes.length > 0 && !found.finishes.includes(finish)) {
                              setFinish(found.finishes[0]);
                            }
                          }
                        }}
                      >
                        {prints.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.set_name} ({p.set?.toUpperCase()}) #{p.collector_number} - €{getCardPrice(p, finish).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Estado de conservación */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-500" /> Estado
                      </label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                      >
                        {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Acabado (Foil / No-Foil) */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Acabado
                      </label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={finish}
                        onChange={(e) => setFinish(e.target.value)}
                      >
                        {selectedPrintFinishes.map((f: string) => (
                          <option key={f} value={f}>
                            {f === 'foil' ? 'Foil (Brillante)' : f === 'etched' ? 'Etched (Foil Grabado)' : 'Non-foil (Normal)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Idioma */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-500" /> Idioma
                      </label>
                      <select 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cantidad</label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                        <button 
                          className="px-3.5 py-2.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="1"
                          className="w-full text-center bg-transparent text-white text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button 
                          className="px-3.5 py-2.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          onClick={() => setQuantity(q => q + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-slate-400">Precio Mercado: <span className="text-white font-bold">€{getCardPrice(selectedPrint, finish).toFixed(2)}</span></p>
                      <p className="text-indigo-400 font-semibold">
                        Valor Compra ({getAppliedRate(getCardPrice(selectedPrint, finish), tradeType)}%): €{(getCardPrice(selectedPrint, finish) * (getAppliedRate(getCardPrice(selectedPrint, finish), tradeType) / 100) * getConditionModifier(condition)).toFixed(2)}
                      </p>
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={handleAddItem}
                      className="flex items-center gap-1.5 px-5"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <p className="text-red-400 text-xs flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</p>
            )}
          </Card>

          {/* Listado de artículos en el borrador actual */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Cartas Seleccionadas ({items.reduce((acc, item) => acc + item.quantity, 0)})
              </h3>
              {items.length > 0 && (
                <button 
                  onClick={() => setItems([])}
                  className="text-xs text-rose-500 hover:text-rose-400 font-bold transition-colors"
                >
                  Limpiar Lista
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Info className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm">Aún no has añadido ninguna carta a la lista.</p>
                <p className="text-xs text-slate-600">Utiliza el buscador superior para buscar y añadir singles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                      <th className="px-6 py-3">Carta</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3">Acabado / Idioma</th>
                      <th className="px-6 py-3 text-center">Cant.</th>
                      <th className="px-6 py-3 text-right">Mercado</th>
                      <th className="px-6 py-3 text-right">Compra</th>
                      <th className="px-6 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/10 transition-all">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-9 h-12 bg-slate-800 rounded border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                            {item.scryfallCardData.image_uris?.small || item.scryfallCardData.card_faces?.[0]?.image_uris?.small ? (
                              <img 
                                src={item.scryfallCardData.image_uris?.small || item.scryfallCardData.card_faces?.[0]?.image_uris?.small} 
                                alt={item.name} 
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="text-[6px] text-slate-500">Img</div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white leading-tight">{item.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{item.setCode} ({item.setName})</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-slate-850 px-2.5 py-1 rounded-md text-slate-300 font-semibold border border-slate-800">
                            {CONDITION_LABELS[item.condition] || item.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-y-0.5">
                          <div className="text-xs">
                            {item.finish === 'foil' ? (
                              <span className="text-amber-400 font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3" /> Foil</span>
                            ) : item.finish === 'etched' ? (
                              <span className="text-indigo-400 font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3" /> Etched</span>
                            ) : (
                              <span className="text-slate-400">Normal</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">{item.language}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-white">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400">
                          €{item.marketPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                          €{item.buyPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Derecha: Resumen y acción */}
        <div className="space-y-6">
          <Card className="border border-slate-800/80 bg-slate-900/40 p-6 space-y-6 sticky top-24">
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-400" />
              Resumen Tasación
            </CardTitle>

            {/* Selector de método de pago */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Método de Pago Preferido</label>
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

            <div className="space-y-4 text-sm divide-y divide-slate-850">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Porcentaje de Compra</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs ${tradeType === 'STORE_CREDIT' ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10'}`}>
                  {currentRate}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 py-2">
                <span className="text-slate-400">Total Cartas</span>
                <span className="text-white font-bold">
                  {items.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 py-2">
                <span className="text-slate-400">Valor de Mercado</span>
                <span className="text-slate-300 font-mono">
                  €{totalMarketVal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 py-2 text-base">
                <span className="font-bold text-white">Importe Ofrecido</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">
                  €{totalOfferVal.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850/40">
              {tradeType === 'STORE_CREDIT' 
                ? 'Has seleccionado cobrar en Crédito de Tienda. Al aprobarse, el dinero se abonará automáticamente en el saldo de tu cuenta.'
                : 'Has seleccionado cobrar en Efectivo. Tras la validación, la tienda procederá al pago directo.'}
            </p>

            <Button 
              variant="primary" 
              className="w-full py-4 font-bold text-base rounded-2xl"
              disabled={items.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar Tasación'
              )}
            </Button>
          </Card>
        </div>

      </div>
    </div>
  );
}
