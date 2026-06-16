"use client";

import { useState, useEffect, useRef } from "react";
import { searchScryfallLiveAction, addStockItemAction, fetchScryfallAutocompleteAction } from "@/app/actions/inventory-actions";
import { Button } from "@/components/ui/Button";
import BulkImportManager from "./BulkImportManager";

type ManagerTab = "single" | "bulk";

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("single");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingCardId, setAddingCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  // Estados del autocompletado
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados del formulario para añadir stock
  const [condition, setCondition] = useState("NM");
  const [finish, setFinish] = useState(""); // Corrección de error: valor por defecto vacío, se establece tras seleccionar una carta
  const [language, setLanguage] = useState("en");
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState("");

  useEffect(() => {
    // Corrección de error: omitir el autocompletado en la pestaña de carga masiva
    if (activeTab !== "single") return;
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        const res = await fetchScryfallAutocompleteAction(query);
        if (res.success) setSuggestions(res.data);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = async (searchQuery: string, isExact = false) => {
    if (searchQuery.length < 3) return;
    setLoading(true);
    setShowSuggestions(false);
    setSelectedCard(null);
    setFinish(""); // Corrección de error: restablecer el acabado al realizar una nueva búsqueda
    setResults([]);

    // Corrección de error: usar la bandera isExact en lugar del estado obsoleto de sugerencias
    const finalQuery = isExact ? `!"${searchQuery}"` : searchQuery;

    const res = await searchScryfallLiveAction(finalQuery);
    if (res.success) {
      setResults(res.data);
    } else {
      alert("Error al buscar: " + res.message);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    // Corrección de error: pasar isExact=true dado que el usuario eligió del autocompletado
    executeSearch(suggestion, true);
  };

  const handleAddStock = async () => {
    if (!selectedCard) return;
    setAddingCardId(selectedCard.id);
    const parsedPrice = salePrice ? parseFloat(salePrice) : null;
    // Corrección de error: se elimina el estado priceMode, siempre se utiliza MANUAL (el recurso de precio de mercado está en la acción)
    const res = await addStockItemAction(
      selectedCard,
      condition,
      finish || selectedCard.finishes?.[0] || "nonfoil", // Corrección de error: nunca enviar un acabado vacío
      language,
      quantity,
      "MANUAL",
      parsedPrice,
      null
    );
    if (res.success) {
      // Corrección de error: traducido al español
      alert("¡Carta añadida al inventario!");
      setSelectedCard(null);
      setFinish("");
      setQuantity(1);
      setSalePrice("");
    } else {
      alert("Error al añadir: " + res.message);
    }
    setAddingCardId(null);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Añadir Singles al Stock</h2>
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === "single" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              onClick={() => setActiveTab("single")}
            >
              Carta individual
            </button>
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === "bulk" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              onClick={() => setActiveTab("bulk")}
            >
              Importar en lote
            </button>
          </div>
        </div>
        {activeTab === "bulk" && <BulkImportManager />}

        {activeTab === "single" && (
          <>
            <div className="relative mb-6" ref={dropdownRef}>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Busca por nombre de carta..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
                          onClick={() => handleSuggestionClick(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Buscando..." : "Buscar"}
                </Button>
              </form>
            </div>

            {/* Paso 1: Listado de Ediciones */}
            {!selectedCard && results.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-gray-400 text-sm font-medium">Selecciona la edición:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.map((card) => {
                    const imageUrl = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
                    const releasedAt = card.released_at ? new Date(card.released_at).getFullYear() : "";

                    let displayPrice = "";
                    if (card.prices?.eur) {
                      displayPrice = `€${parseFloat(card.prices.eur).toFixed(2)}`;
                    } else if (card.prices?.eur_foil) {
                      displayPrice = `€${parseFloat(card.prices.eur_foil).toFixed(2)} (Foil)`;
                    } else if (card.prices?.usd) {
                      displayPrice = `€${(parseFloat(card.prices.usd) * 0.92).toFixed(2)}`;
                    } else if (card.prices?.usd_foil) {
                      displayPrice = `€${(parseFloat(card.prices.usd_foil) * 0.92).toFixed(2)} (Foil)`;
                    }

                    return (
                      <div
                        key={card.id}
                        className="p-3 bg-gray-800 hover:bg-gray-700 cursor-pointer rounded border border-gray-700 flex items-center gap-4 transition-colors"
                        onClick={() => {
                          setSelectedCard(card);
                          // Corrección de error: establecer el acabado por defecto al primero disponible para esta carta
                          const firstFinish = card.finishes?.[0] ?? "nonfoil";
                          setFinish(firstFinish);
                        }}
                      >
                        <div className="w-12 h-16 bg-gray-900 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={card.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 text-[10px]">Sin imagen</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{card.name}</h4>
                          <p className="text-xs text-gray-400 truncate">{card.set_name} ({card.set.toUpperCase()}) - {releasedAt}</p>
                          {displayPrice && <p className="text-xs text-green-400 font-bold mt-1">Mercado: {displayPrice}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 2: Formulario de Inventario/Stock */}
            {selectedCard && (
              <div className="bg-gray-800 rounded-lg border border-indigo-500/50 p-5 mt-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-4">
                    {/* Corrección de error: solo renderizar la imagen si la fuente (src) existe */}
                    {(selectedCard.image_uris?.small || selectedCard.card_faces?.[0]?.image_uris?.small) && (
                      <div className="w-16 h-auto">
                        <img
                          src={selectedCard.image_uris?.small || selectedCard.card_faces?.[0]?.image_uris?.small}
                          alt={selectedCard.name}
                          className="w-full rounded"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedCard.name}</h3>
                      <p className="text-sm text-gray-400">{selectedCard.set_name} ({selectedCard.set.toUpperCase()})</p>
                      {(() => {
                        const isFoilish = finish === 'foil' || finish === 'etched';
                        const marketPrice = isFoilish
                          ? selectedCard.prices?.eur_foil
                          : selectedCard.prices?.eur;
                        const usdPrice = isFoilish
                          ? selectedCard.prices?.usd_foil
                          : selectedCard.prices?.usd;

                        let displayVal = 'N/A';
                        if (marketPrice) {
                          displayVal = `€${parseFloat(marketPrice).toFixed(2)}`;
                        } else if (usdPrice) {
                          displayVal = `€${(parseFloat(usdPrice) * 0.92).toFixed(2)}`;
                        }
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            Precio mercado ({finish || 'nonfoil'}):{" "}
                            <span className="text-green-400 font-semibold">
                              {displayVal}
                            </span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="text-gray-400 hover:text-white text-sm underline"
                  >
                    Cambiar edición
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Idioma</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm">
                      <option value="en">Inglés (EN)</option>
                      <option value="es">Español (ES)</option>
                      <option value="ja">Japonés (JA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Estado</label>
                    <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm">
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
                    <select
                      value={finish}
                      onChange={e => {
                        setFinish(e.target.value);
                        setSalePrice(""); // borrar la sobreescritura para que el marcador de posición se actualice de inmediato
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                    >
                      {selectedCard.finishes?.includes('nonfoil') && <option value="nonfoil">Non-foil</option>}
                      {selectedCard.finishes?.includes('foil') && <option value="foil">Foil</option>}
                      {selectedCard.finishes?.includes('etched') && <option value="etched">Etched</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                    <input
                      type="number" min="1" value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Precio Venta (€)</label>
                    <input
                      type="number" step="0.01"
                      placeholder={(() => {
                        const isFoilish = finish === 'foil' || finish === 'etched';
                        const eurPrice = isFoilish ? selectedCard.prices?.eur_foil : selectedCard.prices?.eur;
                        if (eurPrice) return `Auto (€${parseFloat(eurPrice).toFixed(2)})`;
                        const usdPrice = isFoilish ? selectedCard.prices?.usd_foil : selectedCard.prices?.usd;
                        if (usdPrice) return `Auto (€${(parseFloat(usdPrice) * 0.92).toFixed(2)})`;
                        return "Auto (mercado)";
                      })()}
                      value={salePrice}
                      onChange={e => setSalePrice(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500"
                    />
                  </div>
                </div>

                <Button
                  variant="primary" className="w-full"
                  onClick={handleAddStock}
                  disabled={addingCardId === selectedCard.id}
                >
                  {addingCardId === selectedCard.id ? "Añadiendo..." : "Añadir al Inventario"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
