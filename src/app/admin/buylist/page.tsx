import Link from "next/link";
import { Coins, Clock, CheckCircle, XCircle, ArrowRight, User } from "lucide-react";
import { getAdminBuylistRequestsAction } from "@/app/actions/buylist-actions";

export default async function AdminBuylistPage() {
  const res = await getAdminBuylistRequestsAction();
  const requests = res.success ? (res.data || []) : [];

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    PENDING: { label: "Pendiente de revisión", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
    APPROVED: { label: "Aprobada e ingresada", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle },
    REJECTED: { label: "Rechazada", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Coins className="w-8 h-8 text-indigo-400" />
            Tasaciones Recibidas (Buylist)
          </h1>
          <p className="text-slate-400 mt-2">
            Revisa, modifica, aprueba o rechaza las propuestas de venta de cartas enviadas por los jugadores.
          </p>
        </div>
        
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-400 font-bold">{pendingCount}</span>
            <span className="text-slate-300">pendientes de revisión</span>
          </div>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
          <div className="bg-slate-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-slate-700">
            <Coins className="w-8 h-8 text-slate-500" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">No hay tasaciones registradas</h3>
            <p className="text-sm text-slate-400">
              Las propuestas de venta que envíen los jugadores aparecerán listadas aquí para tu valoración.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="px-6 py-4">ID de Tasación</th>
                  <th className="px-6 py-4">Jugador</th>
                  <th className="px-6 py-4">Fecha de Envío</th>
                  <th className="px-6 py-4">Cant. Cartas</th>
                  <th className="px-6 py-4">Porcentaje</th>
                  <th className="px-6 py-4">Importe Tasado</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                {requests.map((req) => {
                  const statusInfo = statusMap[req.status] || { label: req.status, color: "text-slate-400 bg-slate-800", icon: Clock };
                  const Icon = statusInfo.icon;
                  const totalCards = req.items.reduce((acc, item) => acc + item.quantity, 0);

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/20 transition-all">
                      <td className="px-6 py-5 font-mono text-xs text-indigo-400 font-bold">
                        #{req.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{req.user.name}</div>
                            <div className="text-[10px] text-slate-500">{req.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {new Date(req.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-5 font-bold text-white">
                        {totalCards}
                      </td>
                      <td className="px-6 py-5">
                        {req.defaultRate}%
                      </td>
                      <td className="px-6 py-5 text-emerald-400 font-bold">
                        €{req.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Link href={`/admin/buylist/${req.id}`}>
                          <button className="inline-flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all">
                            {req.status === 'PENDING' ? 'Revisar' : 'Ver'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
