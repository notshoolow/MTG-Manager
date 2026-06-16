import Link from "next/link";
import { Plus, Coins, Clock, CheckCircle, XCircle } from "lucide-react";
import { getPlayerBuylistRequestsAction } from "@/app/actions/buylist-actions";

export default async function PlayerBuylistPage() {
  const res = await getPlayerBuylistRequestsAction();
  const requests = res.success ? (res.data || []) : [];

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    PENDING: { label: "Pendiente de revisión", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
    APPROVED: { label: "Aprobada y Pagada", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle },
    REJECTED: { label: "Rechazada", color: "text-rose-400 bg-rose-400/10 border-rose-400/20", icon: XCircle },
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Coins className="w-8 h-8 text-indigo-400" />
            Vender Singles (Buylist)
          </h1>
          <p className="text-slate-400 mt-2">
            Envíanos tus cartas y te las compraremos por un porcentaje de su valor de mercado.
          </p>
        </div>
        <Link href="/player/buylist/new">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20">
            <Plus className="w-5 h-5" />
            Nueva Tasación
          </button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
          <div className="bg-slate-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-slate-700">
            <Coins className="w-8 h-8 text-slate-500" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">No tienes tasaciones creadas</h3>
            <p className="text-sm text-slate-400">
              Crea una lista de las cartas que te gustaría vender a la tienda para recibir una primera oferta de compra basada en el mercado actual.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/player/buylist/new">
              <button className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-semibold text-sm px-6 py-3 rounded-xl transition-all">
                Crear tu primera tasación
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th className="px-6 py-4">ID de Tasación</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Cant. Cartas</th>
                  <th className="px-6 py-4">Porcentaje Aplicado</th>
                  <th className="px-6 py-4">Importe Ofrecido</th>
                  <th className="px-6 py-4">Estado</th>
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
