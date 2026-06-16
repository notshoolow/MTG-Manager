'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Check, Loader2, ChevronDown, Package } from 'lucide-react';
import { fetchScryfallAutocompleteAction, searchScryfallLiveAction } from '@/app/actions/inventory-actions';
import { subscribeToStock } from '@/app/actions/notification-actions';

export default function CardAlertSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [prints, setPrints] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [mode, setMode] = useState<'any' | 'specific'>('any');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Servicio de autocompletado en respuesta a la pulsación de teclas del usuario
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetchScryfallAutocompleteAction(query);
      if (res.success) setSuggestions((res as any).data || []);
    }, 300);
  }, [query]);

  const handleSelectName = async (name: string) => {
    setQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedCard(null);
    setPrints([]);
    setSubscribed(false);
    setError('');
    setSearching(true);

    // Búsqueda de todas las impresiones (prints) de esta carta exacta
    const res = await searchScryfallLiveAction(`!"${name}"`);
    if (res.success) {
      const data = (res as any).data || [];
      setPrints(data);
      // Selección predeterminada: se escoge la primera impresión como referencia del modo específico
      if (data.length > 0) setSelectedCard(data[0]);
    } else {
      setError('No se encontraron resultados en Scryfall.');
    }
    setSearching(false);
  };

  const handleSubscribe = async () => {
    if (!selectedCard) return;
    setLoading(true);
    setError('');
    const res = await subscribeToStock(
      '',
      selectedCard.oracle_id || selectedCard.id,
      mode === 'specific' ? selectedCard.id : undefined
    );
    if (res.success) {
      setSubscribed(true);
    } else {
      setError('Error al registrar el aviso. Inténtalo de nuevo.');
    }
    setLoading(false);
  };

  const imageUrl = selectedCard
    ? (selectedCard.image_uris?.normal || selectedCard.card_faces?.[0]?.image_uris?.normal || '')
    : '';

  return (
    <div className="space-y-6">
      {/* Cuadro de búsqueda */}
      <div className="relative">
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Escribe el nombre de una carta (ej: Lightning Bolt)..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />}
        </div>

        {/* Menú desplegable de autocompletado */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                onMouseDown={() => handleSelectName(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resultados */}
      {prints.length > 0 && selectedCard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Previsualización de la carta */}
          <div className="flex flex-col items-center gap-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={selectedCard.name}
                className="rounded-2xl shadow-2xl max-w-[220px] w-full"
              />
            ) : (
              <div className="w-[220px] h-[308px] bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-sm">
                Sin imagen
              </div>
            )}
            <div className="text-center">
              <p className="text-white font-bold text-lg">{selectedCard.name}</p>
              <p className="text-slate-400 text-sm">{selectedCard.set_name} ({selectedCard.set?.toUpperCase()})</p>
              {selectedCard.prices?.eur && (
                <p className="text-emerald-400 font-bold mt-1">€{selectedCard.prices.eur}</p>
              )}
            </div>
          </div>

          {/* Panel de suscripción */}
          <div className="space-y-4">
            {/* Selector de edición */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                Edición ({prints.length} disponibles)
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {prints.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedCard(p); setSubscribed(false); }}
                    className={`p-2.5 rounded-xl text-xs text-left border transition-all ${
                      selectedCard?.id === p.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold truncate">{p.set_name}</div>
                    <div className="text-[10px] mt-0.5 uppercase tracking-wider">{p.set}</div>
                    {p.prices?.eur && (
                      <div className="text-emerald-400 font-bold mt-1">€{p.prices.eur}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de tipo de aviso */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">
                Tipo de aviso
              </p>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                <button
                  onClick={() => setMode('any')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    mode === 'any'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Cualquier edición
                </button>
                <button
                  onClick={() => setMode('specific')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                    mode === 'specific'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Solo esta edición
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 px-1">
                {mode === 'any'
                  ? 'Te avisaremos si entra cualquier versión de esta carta.'
                  : `Solo te avisaremos si entra exactamente "${selectedCard.set_name} (${selectedCard.set?.toUpperCase()})".`}
              </p>
            </div>

            {/* Botón de suscripción */}
            {subscribed ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-500 p-1.5 rounded-full">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-emerald-400 font-bold text-sm">¡Aviso registrado!</p>
                  <p className="text-emerald-500/70 text-xs">
                    Te notificaremos cuando <span className="font-semibold">{selectedCard.name}</span> esté disponible.
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {loading ? 'Registrando...' : 'Avísame cuando esté disponible'}
              </button>
            )}

            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
          </div>
        </div>
      )}

      {/* Estado vacío cuando la consulta no arroja resultados */}
      {!searching && query.length >= 2 && prints.length === 0 && !showSuggestions && (
        <div className="text-center py-12 text-slate-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron resultados para "{query}"</p>
          <p className="text-xs mt-1">Intenta con el nombre exacto de la carta</p>
        </div>
      )}
    </div>
  );
}
