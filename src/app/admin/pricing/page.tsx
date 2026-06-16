"use client";
 
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { 
  getConditionModifiersAction, 
  upsertConditionModifierAction,
  getPricingRulesAction,
  getRoundingBandsAction,
  upsertRoundingBandAction,
  deleteRoundingBandAction,
  getFlashSalesAction,
  createFlashSaleAction,
  deleteFlashSaleAction,
  expireStaleFlashSalesAction,
  syncPricesAction,
  getSyncLogsAction
} from "@/app/actions/pricing-actions";
import { getStoreSettingsAction, updateStoreSettingsAction } from "@/app/actions/store-actions";
import { 
  getBuylistPriceBandsAction, 
  upsertBuylistPriceBandAction, 
  deleteBuylistPriceBandAction 
} from "@/app/actions/buylist-pricing-actions";
 
type Tab = "CONDITIONS" | "RULES" | "ROUNDING" | "FLASH" | "BUYLIST" | "SYNC";
 
export default function PricingAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("CONDITIONS");
  const [loading, setLoading] = useState(true);
 
  // Estados
  const [conditions, setConditions] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [store, setStore] = useState<any>(null);
  const [buylistBands, setBuylistBands] = useState<any[]>([]);
 
  const loadData = async () => {
    setLoading(true);
    await expireStaleFlashSalesAction(); // lazy expire
 
    const [cRes, rRes, bRes, sRes, lRes, storeData, bbRes] = await Promise.all([
      getConditionModifiersAction(),
      getPricingRulesAction(),
      getRoundingBandsAction(),
      getFlashSalesAction(),
      getSyncLogsAction(),
      getStoreSettingsAction(),
      getBuylistPriceBandsAction()
    ]);
 
    if (cRes.success) setConditions(cRes.data || []);
    if (rRes.success) setRules(rRes.data || []);
    if (bRes.success) setBands(bRes.data || []);
    if (sRes.success) setSales(sRes.data || []);
    if (lRes.success) setSyncLogs(lRes.data || []);
    if (storeData) setStore(storeData);
    if (bbRes.success) setBuylistBands(bbRes.data || []);
    
    setLoading(false);
  };
 
  useEffect(() => {
    loadData();
  }, []);
 
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Motor de Precios</h1>
        <p className="text-gray-400">Gestiona modificadores por estado, reglas de ajuste, redondeo y ventas flash.</p>
      </div>
 
      <div className="flex gap-2 border-b border-gray-800 pb-2 flex-wrap">
        {(["CONDITIONS", "RULES", "ROUNDING", "FLASH", "BUYLIST", "SYNC"] as Tab[]).map((t) => (
          <button
             key={t}
             className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
               activeTab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
             }`}
             onClick={() => setActiveTab(t)}
          >
            {t === "CONDITIONS" && "Condiciones"}
            {t === "RULES" && "Ajustes"}
            {t === "ROUNDING" && "Redondeo"}
            {t === "FLASH" && "Flash Sales"}
            {t === "BUYLIST" && "Tasaciones"}
            {t === "SYNC" && "Sincronización"}
          </button>
        ))}
      </div>
 
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 min-h-[400px]">
        {loading ? (
          <div className="text-gray-400">Cargando datos...</div>
        ) : (
          <>
            {activeTab === "CONDITIONS" && <ConditionsTab items={conditions} onReload={loadData} />}
            {activeTab === "RULES" && <RulesTab items={rules} onReload={loadData} />}
            {activeTab === "ROUNDING" && <RoundingTab items={bands} onReload={loadData} />}
            {activeTab === "FLASH" && <FlashSalesTab items={sales} onReload={loadData} />}
            {activeTab === "BUYLIST" && (
              <BuylistTab 
                store={store} 
                items={buylistBands} 
                onReload={loadData} 
              />
            )}
            {activeTab === "SYNC" && <SyncTab items={syncLogs} onReload={loadData} />}
          </>
        )}
      </div>
    </div>
  );
}
 
function ConditionsTab({ items, onReload }: { items: any[]; onReload: () => void }) {
  const allConditions = ["M", "NM", "EX", "GD", "LP", "PL", "PO"];
  
  const getMultiplier = (c: string) => {
      const match = items.find(i => i.condition === c);
      return match ? match.multiplier : (c === "NM" || c === "M" ? 1.0 : 1.0);
  };
 
  const handleSave = async (c: string, mult: number) => {
    const res = await upsertConditionModifierAction(c, mult);
    if (res.success) {
        onReload();
    } else {
        alert("Error: " + res.message);
    }
  };
 
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Multiplicadores por Estado</h2>
      <p className="text-sm text-gray-400 mb-6">El precio base se multiplicará por este factor. Ejemplo: 0.8 = 80% del precio base.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allConditions.map(c => {
          const currentVal = getMultiplier(c);
          return (
            <div key={c} className="bg-gray-800 p-4 rounded border border-gray-700 flex items-center justify-between">
              <span className="font-bold text-white text-lg w-12">{c}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  step="0.05" 
                  defaultValue={currentVal} 
                  className="bg-gray-900 border border-gray-700 text-white rounded p-1 w-20 text-center"
                  onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== currentVal) handleSave(c, val);
                  }}
                />
                <span className="text-sm text-gray-400">x</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
function RulesTab({ items, onReload }: { items: any[]; onReload: () => void }) {
  return (
    <div>
        <h2 className="text-xl font-bold text-white mb-4">Reglas de Ajuste</h2>
        <p className="text-gray-400 text-sm mb-4">Las reglas se gestionan desde el inventario. Aquí se muestran las reglas activas.</p>
        {items.length === 0 ? <p className="text-gray-500">No hay reglas configuradas.</p> : (
            <ul className="space-y-2">
                {items.map(r => (
                    <li key={r.id} className="p-3 bg-gray-800 border border-gray-700 rounded text-white flex justify-between">
                        <div>
                            <span className="font-bold">{r.name}</span> <span className="text-gray-400 text-sm">({r.type})</span>
                        </div>
                        <div>
                            {r.type === 'FLAT_MARKUP' && `+ €${r.valueA}`}
                            {r.type === 'PERCENT_MARKUP' && `+ ${r.valueA}%`}
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
  )
}
 
function RoundingTab({ items, onReload }: { items: any[]; onReload: () => void }) {
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [rndTo, setRndTo] = useState("");
 
  const handleAdd = async () => {
    if (!minP || !maxP || !rndTo) return;
    await upsertRoundingBandAction(null, parseFloat(minP), parseFloat(maxP), parseFloat(rndTo), items.length);
    setMinP(""); setMaxP(""); setRndTo("");
    onReload();
  };
 
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Bandas de Redondeo</h2>
      
      <div className="flex gap-2 items-end bg-gray-800 p-4 rounded border border-gray-700">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Precio Min</label>
          <input type="number" step="0.01" value={minP} onChange={e=>setMinP(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Precio Max</label>
          <input type="number" step="0.01" value={maxP} onChange={e=>setMaxP(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Redondear a (ej: 0.50)</label>
          <input type="number" step="0.01" value={rndTo} onChange={e=>setRndTo(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
        </div>
        <Button onClick={handleAdd} variant="primary">Añadir</Button>
      </div>
 
      <div className="space-y-2">
        {items.map(b => (
          <div key={b.id} className="flex justify-between items-center p-3 bg-gray-800 border border-gray-700 rounded text-white">
            <span>De <strong className="text-indigo-400">€{b.minPrice}</strong> a <strong className="text-indigo-400">€{b.maxPrice}</strong> &rarr; Redondear a <strong className="text-green-400">€{b.roundTo}</strong></span>
            <button onClick={async () => { await deleteRoundingBandAction(b.id); onReload(); }} className="text-red-400 text-sm hover:underline">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
 
function FlashSalesTab({ items, onReload }: { items: any[]; onReload: () => void }) {
  const active = items.filter(i => i.isActive);
  const expired = items.filter(i => !i.isActive);
 
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Ventas Flash</h2>
          <Button variant="primary" onClick={() => alert("Para crear un Flash Sale, ve al inventario de singles, selecciona cartas usando las casillas y pulsa 'Crear Venta Flash' en la barra inferior.")}>Nueva Venta Flash</Button>
      </div>
 
      <div>
        <h3 className="text-lg font-medium text-green-400 mb-3">Activas</h3>
        {active.length === 0 ? <p className="text-gray-500 text-sm">No hay ventas flash activas.</p> : (
            <div className="space-y-3">
                {active.map(s => (
                    <div key={s.id} className="p-4 bg-gray-800 border border-green-500/30 rounded text-white flex justify-between items-center">
                        <div>
                            <div className="font-bold">{s.name} <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded ml-2">-{s.discount * 100}%</span></div>
                            <div className="text-sm text-gray-400 mt-1">Expira: {new Date(s.expiresAt).toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-1">{s.items.length} items</div>
                        </div>
                        <button onClick={async () => { await deleteFlashSaleAction(s.id); onReload(); }} className="text-red-400 text-sm hover:underline">Eliminar</button>
                    </div>
                ))}
            </div>
        )}
      </div>
 
      <div className="pt-4 border-t border-gray-800">
        <h3 className="text-lg font-medium text-gray-400 mb-3">Historial</h3>
        {expired.length === 0 ? <p className="text-gray-500 text-sm">No hay historial.</p> : (
             <div className="space-y-3 opacity-60">
             {expired.map(s => (
                  <div key={s.id} className="p-4 bg-gray-800 border border-gray-700 rounded text-gray-300 flex justify-between items-center">
                      <div>
                          <div className="font-bold">{s.name} ({s.discount * 100}% off)</div>
                          <div className="text-sm text-gray-500 mt-1">Expiró: {new Date(s.expiresAt).toLocaleString()}</div>
                      </div>
                  </div>
             ))}
         </div>
        )}
      </div>
    </div>
  );
}

function BuylistTab({ 
  store, 
  items, 
  onReload 
}: { 
  store: any; 
  items: any[]; 
  onReload: () => void 
}) {
  const [buylistRate, setBuylistRate] = useState(store?.buylistDefaultRate ?? 70);
  const [buylistRateCredit, setBuylistRateCredit] = useState(store?.buylistDefaultRateCredit ?? 75);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Nuevos campos de rango/banda
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [rateCash, setRateCash] = useState("");
  const [rateCredit, setRateCredit] = useState("");

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    const res = await updateStoreSettingsAction({
      buylistDefaultRate: buylistRate,
      buylistDefaultRateCredit: buylistRateCredit
    });
    if (res.success) {
      alert("Tasas globales guardadas correctamente.");
      onReload();
    } else {
      alert("Error: " + res.message);
    }
    setSavingGlobal(false);
  };

  const handleAddBand = async () => {
    if (!minP || !maxP || !rateCash || !rateCredit) return;
    const res = await upsertBuylistPriceBandAction(
      null, 
      parseFloat(minP), 
      parseFloat(maxP), 
      parseFloat(rateCash), 
      parseFloat(rateCredit)
    );
    if (res.success) {
      setMinP(""); setMaxP(""); setRateCash(""); setRateCredit("");
      onReload();
    } else {
      alert("Error: " + res.message);
    }
  };

  const handleDeleteBand = async (id: string) => {
    const res = await deleteBuylistPriceBandAction(id);
    if (res.success) {
      onReload();
    } else {
      alert("Error: " + res.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tasas Generales */}
      <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-800 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Porcentajes Generales por Defecto</h3>
          <p className="text-xs text-gray-400">Define los porcentajes que se aplicarán si no coincide ninguna banda de precio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label className="font-semibold text-gray-300">Compra en Efectivo (Cash)</label>
              <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded text-xs">{buylistRate}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={buylistRate} 
              onChange={(e) => setBuylistRate(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label className="font-semibold text-gray-300">Compra en Crédito de Tienda</label>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-xs">{buylistRateCredit}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={buylistRateCredit} 
              onChange={(e) => setBuylistRateCredit(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveGlobal} disabled={savingGlobal} variant="primary" size="sm">
            {savingGlobal ? "Guardando..." : "Guardar Tasas Generales"}
          </Button>
        </div>
      </div>

      {/* Rangos / Bandas de Precio de la Buylist */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Rangos de Tasación por Precio</h3>
          <p className="text-xs text-gray-400">Define porcentajes específicos según el valor de mercado de la carta.</p>
        </div>

        {/* Añadir nueva banda */}
        <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-5 gap-4 bg-gray-800/40 p-5 rounded-2xl border border-gray-800 items-end">
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 flex-shrink-0">Precio Mínimo (€)</label>
            <input 
              type="number" 
              step="0.01" 
              value={minP} 
              onChange={e=>setMinP(e.target.value)} 
              placeholder="0.00"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 flex-shrink-0">Precio Máximo (€)</label>
            <input 
              type="number" 
              step="0.01" 
              value={maxP} 
              onChange={e=>setMaxP(e.target.value)} 
              placeholder="5.00"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 flex-shrink-0">% Efectivo (Cash)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              value={rateCash} 
              onChange={e=>setRateCash(e.target.value)} 
              placeholder="50"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-400 flex-shrink-0">% Crédito de Tienda</label>
            <input 
              type="number" 
              min="0"
              max="100"
              value={rateCredit} 
              onChange={e=>setRateCredit(e.target.value)} 
              placeholder="55"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div className="sm:col-span-4 md:col-span-1">
            <Button onClick={handleAddBand} variant="primary" className="w-full py-2.5 text-xs font-bold rounded-xl">
              Añadir Rango
            </Button>
          </div>
        </div>

        {/* Listado de bandas */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-6 bg-gray-950/20 border border-gray-800 rounded-2xl">
              No hay rangos de precio definidos. Se aplicarán siempre las tasas por defecto.
            </p>
          ) : (
            items.map(b => (
              <div key={b.id} className="flex justify-between items-center p-4 bg-gray-950/30 border border-gray-850 rounded-2xl text-xs text-gray-300 hover:bg-gray-950/50 transition-colors">
                <div>
                  Para cartas de <strong className="text-indigo-400 font-mono">€{b.minPrice.toFixed(2)}</strong> a <strong className="text-indigo-400 font-mono">€{b.maxPrice.toFixed(2)}</strong> &rarr; Pagos al <strong className="text-emerald-400 font-bold">{b.rateCash}% Cash</strong> y <strong className="text-emerald-400 font-bold">{b.rateCredit}% Crédito</strong>
                </div>
                <button 
                  onClick={() => handleDeleteBand(b.id)} 
                  className="text-red-400 hover:text-red-300 font-bold hover:underline"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
 
function SyncTab({ items, onReload }: { items: any[]; onReload: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [currentProgressLog, setCurrentProgressLog] = useState<any>(null);
  
  const handleSync = async () => {
    setSyncing(true);
    setCurrentProgressLog(null);
 
    const pollInterval = setInterval(async () => {
      const logsRes = await getSyncLogsAction();
      if (logsRes.success && logsRes.data && logsRes.data.length > 0) {
        const runningLog = logsRes.data.find((l: any) => l.status === "RUNNING");
        if (runningLog) {
          setCurrentProgressLog(runningLog);
        }
      }
    }, 1500);
 
    const res = await syncPricesAction();
    
    clearInterval(pollInterval);
    setCurrentProgressLog(null);
    setSyncing(false);
    onReload();
 
    if (res.success) {
      alert(`Sincronización finalizada. Cartas actualizadas: ${res.count}`);
    } else {
      alert("Error en la sincronización: " + res.message);
    }
  };
 
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-950/20 p-4 border border-gray-800 rounded-2xl flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Sincronización de Precios</h2>
          <p className="text-gray-400 text-xs mt-1">Sincroniza los precios base con la API de Scryfall y genera alertas de precio automáticamente.</p>
        </div>
        <Button variant="primary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar Precios Ahora"}
        </Button>
      </div>
 
      {syncing && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl flex items-center gap-4 text-white">
          <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Sincronización en curso...</p>
            <p className="text-xs text-indigo-300 mt-0.5">
              {currentProgressLog 
                ? `Actualizadas: ${currentProgressLog.cardsUpserted ?? 0} cartas.` 
                : "Inicializando conexión con la API de Scryfall..."}
            </p>
          </div>
        </div>
      )}
  
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Historial de Sincronizaciones</h3>
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay registros de sincronización.</p>
        ) : (
          <div className="overflow-x-auto bg-gray-950 rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="p-3">Fecha Inicio</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Cartas Actualizadas</th>
                  <th className="p-3">Detalle / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map(log => (
                  <tr key={log.id} className="hover:bg-gray-900/50">
                    <td className="p-3">{new Date(log.startedAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.status === "SUCCESS" ? "bg-green-900/40 text-green-400" :
                        log.status === "RUNNING" ? "bg-blue-900/40 text-blue-400" :
                        "bg-red-900/40 text-red-400"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{log.cardsUpserted ?? 0}</td>
                    <td className="p-3 text-gray-500 max-w-xs truncate" title={log.error || ""}>
                      {log.error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
