'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Bell, Check, Info } from 'lucide-react';
import { subscribeToStock } from '@/app/actions/notification-actions';

interface StockSubscriptionProps {
  oracleId: string;
  scryfallCardId: string;
  cardName: string;
}

export default function StockSubscription({ oracleId, scryfallCardId, cardName }: StockSubscriptionProps) {
  const [mode, setMode] = useState<'specific' | 'any'>('any');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    // En este sistema simulado, no se dispone de autenticación real configurada.
    // La acción subyacente gestionará la búsqueda o creación de un usuario de prueba en caso necesario.
    // De forma transitoria, se delega esta resolución a la lógica del servidor (pasando null).
    
    const res = await subscribeToStock(
      null, // El identificador de usuario será resuelto por el mock de autenticación
      oracleId, 
      mode === 'specific' ? scryfallCardId : undefined
    );

    if (res.success) {
      setSubscribed(true);
    } else {
      alert('Error al suscribirse');
    }
    setLoading(false);
  };

  if (subscribed) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
        <div className="bg-emerald-500 p-1.5 rounded-full">
          <Check className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-emerald-400 font-bold text-sm">¡Suscripción confirmada!</p>
          <p className="text-emerald-500/70 text-xs">Te avisaremos en cuanto recibamos stock de {cardName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="bg-indigo-500/20 p-2 rounded-lg mt-1">
          <Bell className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h4 className="text-white font-bold">Agotado temporalmente</h4>
          <p className="text-slate-400 text-sm">Suscríbete y recibe una notificación inmediata cuando tengamos unidades disponibles.</p>
        </div>
      </div>

      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
        <button
          onClick={() => setMode('any')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
            mode === 'any' 
              ? 'bg-slate-800 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Cualquier edición
        </button>
        <button
          onClick={() => setMode('specific')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
            mode === 'specific' 
              ? 'bg-slate-800 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Solo esta edición
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
        <Info className="w-3 h-3" />
        <p>
          {mode === 'any' 
            ? 'Te avisaremos si entra cualquier versión de esta carta.' 
            : 'Solo te avisaremos si entra exactamente esta versión/arte.'}
        </p>
      </div>

      <Button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full py-4 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center gap-2 font-bold"
      >
        {loading ? 'Procesando...' : (
          <>
            <Bell className="w-4 h-4" />
            Avísame
          </>
        )}
      </Button>
    </div>
  );
}
