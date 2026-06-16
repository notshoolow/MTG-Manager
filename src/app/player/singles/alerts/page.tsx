import CardAlertSearch from '@/components/singles/CardAlertSearch';
import ActiveSubscriptionsList from '@/components/singles/ActiveSubscriptionsList';
import { Bell } from 'lucide-react';
import Link from 'next/link';
 
export const metadata = {
  title: 'Alertas de Stock | MTG Manager',
  description: 'Suscríbete para recibir notificaciones cuando una carta esté disponible en stock.',
};
 
export default function CardAlertsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Cabecera */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl">
            <Bell className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Alertas de Stock</h1>
            <p className="text-slate-400 mt-0.5 text-sm">
              Busca cualquier carta y recibe un aviso cuando la tengamos disponible.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Link
            href="/player/singles"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </div>
 
      {/* Banner Informativo */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
        <Bell className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-indigo-300 text-sm font-semibold">¿Cómo funciona?</p>
          <p className="text-indigo-400/70 text-xs mt-1 leading-relaxed">
            Escribe el nombre de la carta que buscas. Puedes suscribirte a <strong>cualquier edición</strong> de esa carta, 
            o a una <strong>edición específica</strong>. En cuanto tengamos unidades disponibles, 
            recibirás una notificación en la campana de la barra superior.
          </p>
        </div>
      </div>
 
      {/* Componente de Búsqueda */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <CardAlertSearch />
      </div>
 
      {/* Listado de Suscripciones Activas */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <ActiveSubscriptionsList />
      </div>
    </div>
  );
}
