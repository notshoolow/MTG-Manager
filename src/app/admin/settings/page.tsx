'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Settings, Bell, TrendingUp, Save, Info } from 'lucide-react';
import { getStoreSettingsAction, updateStoreSettingsAction } from '@/app/actions/store-actions';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daily, setDaily] = useState(10);
  const [weekly, setWeekly] = useState(20);

  useEffect(() => {
    getStoreSettingsAction().then(store => {
      if (store) {
        setDaily(store.priceAlertDailyThreshold);
        setWeekly(store.priceAlertWeeklyThreshold);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateStoreSettingsAction({
      priceAlertDailyThreshold: daily,
      priceAlertWeeklyThreshold: weekly
    });
    
    if (res.success) {
      alert('Configuración guardada correctamente');
    } else {
      alert('Error: ' + res.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-white">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-400" />
          Ajustes de la Tienda
        </h1>
        <p className="text-slate-400 mt-2">Configura los parámetros globales y el sistema de alertas automáticas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Alertas de Precio */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-500/20 p-2 rounded-xl">
              <Bell className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Alertas de Precio</h2>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed">
            Define el porcentaje de cambio necesario en el precio de Scryfall para disparar una notificación de administrador.
          </p>

          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Umbral Diario
                </label>
                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded-lg text-xs">{daily}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={daily} 
                onChange={(e) => setDaily(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Se notificará si el precio cambia más de este % en 24 horas.</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Umbral Semanal
                </label>
                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded-lg text-xs">{weekly}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={weekly} 
                onChange={(e) => setWeekly(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Se notificará si el precio cambia más de este % en 7 días.</p>
            </div>
          </div>
        </div>

        {/* Información del Sistema */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-xl">
                <Info className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Estado del Monitor</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-sm text-slate-400">Sync de Precios</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  ACTIVO
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-sm text-slate-400">Suscripciones Activas</span>
                <span className="text-xs font-bold text-indigo-400">0 jugadores</span>
              </div>
            </div>
          </div>

          <Button 
            variant="primary" 
            className="w-full py-6 mt-8 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}

