"use client";
 
import { useState, useEffect } from "react";
import { getUserStockNotifications, unsubscribeFromStockAction } from "@/app/actions/notification-actions";
import { Trash2, Package } from "lucide-react";
 
export default function ActiveSubscriptionsList() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
 
  const fetchSubs = async () => {
    const res = await getUserStockNotifications();
    if (res.success) {
      setSubs(res.data || []);
    }
    setLoading(false);
  };
 
  useEffect(() => {
    fetchSubs();
  }, []);
 
  const handleUnsubscribe = async (id: string) => {
    if (confirm("¿Seguro que deseas eliminar esta alerta?")) {
      const res = await unsubscribeFromStockAction(id);
      if (res.success) {
        setSubs(prev => prev.filter(s => s.id !== id));
      } else {
        alert("Error al desuscribirse.");
      }
    }
  };
 
  if (loading) {
    return <div className="text-gray-400 text-sm">Cargando tus suscripciones...</div>;
  }
 
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Package className="w-5 h-5 text-indigo-400" />
        Mis Alertas Activas
      </h2>
      
      {subs.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No tienes alertas de stock activas en este momento.</p>
      ) : (
        <div className="grid gap-3">
          {subs.map((sub) => (
            <div 
              key={sub.id} 
              className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-bold text-white text-sm">{sub.cardName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creada el: {new Date(sub.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => handleUnsubscribe(sub.id)}
                className="p-2 text-slate-400 hover:text-red-400 bg-slate-950/40 border border-slate-800 hover:border-red-950/30 rounded-lg transition-colors"
                title="Eliminar Alerta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
