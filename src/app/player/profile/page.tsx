import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { Trophy, Calendar, ShoppingBag, User } from "lucide-react";
import { getMockUserId } from "@/lib/auth";
 
export default async function PlayerProfilePage() {
  // Recuperación de la entidad del jugador simulado activo
  const mockUserId = await getMockUserId();
  const player = await prisma.user.findUnique({
    where: { id: mockUserId },
    include: {
      registrations: {
        include: {
          tournament: true
        },
        orderBy: { createdAt: "desc" }
      },
      orders: {
        include: {
          items: {
            include: {
              stockItem: {
                include: { scryfallCard: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
 
  if (!player) {
    return notFound();
  }
 
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Mi Perfil</h1>
        <p className="text-gray-400">Consulta tus datos personales, historial de torneos y pedidos realizados.</p>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna izquierda: Ficha de información de usuario */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="flex flex-col items-center text-center p-8 border-slate-800">
            <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center font-bold text-3xl text-indigo-400 border border-slate-700 overflow-hidden mb-4 shadow-xl">
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
              ) : (
                player.name.charAt(0).toUpperCase()
              )}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{player.name}</h2>
            <p className="text-sm text-gray-500 mb-6">{player.email}</p>
            
            <div className="w-full space-y-3 pt-6 border-t border-gray-800 text-left">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><User className="w-4 h-4" /> Rol</span>
                <span className="text-white font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-xs uppercase">{player.role}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Miembro desde</span>
                <span className="text-slate-300 font-medium">{new Date(player.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800/60">
                <span className="text-emerald-400 font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Crédito de Tienda
                </span>
                <span className="text-emerald-400 font-extrabold text-base font-mono">
                  €{(player.storeCredit ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
 
        {/* Columna derecha: Historial de torneos e historial transaccional */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Historial de Torneos */}
          <Card>
            <CardTitle className="flex items-center gap-2 text-white border-b border-gray-800 pb-4 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              Historial de Torneos ({player.registrations.length})
            </CardTitle>
            
            {player.registrations.length === 0 ? (
              <p className="text-gray-500 italic text-sm py-4">No te has inscrito en ningún torneo todavía.</p>
            ) : (
              <div className="space-y-4">
                {player.registrations.map(reg => (
                  <div key={reg.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-800/80 flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-sm">{reg.tournament.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Formato: <span className="text-slate-300">{reg.tournament.format}</span> | Fecha: <span className="text-slate-300">{reg.tournament.date ? new Date(reg.tournament.date).toLocaleDateString() : 'N/A'}</span>
                      </p>
                      {reg.deckUrl && (
                        <a href={reg.deckUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-2 inline-block">
                          Ver Baraja &rarr;
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-center">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block uppercase font-semibold">Puntuación</span>
                        <span className="font-mono text-white font-bold">{reg.score} pts</span>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                        reg.deckStatus === "VALIDATED" ? "bg-green-950 text-green-400 border border-green-900/50" : "bg-gray-800 text-gray-400"
                      }`}>
                        {reg.deckStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
 
          {/* Historial de Pedidos */}
          <Card>
            <CardTitle className="flex items-center gap-2 text-white border-b border-gray-800 pb-4 mb-4">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              Historial de Pedidos ({player.orders.length})
            </CardTitle>
 
            {player.orders.length === 0 ? (
              <p className="text-gray-500 italic text-sm py-4">No has realizado ninguna compra todavía.</p>
            ) : (
              <div className="space-y-4">
                {player.orders.map(order => (
                  <div key={order.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-gray-800/50 pb-2">
                      <span className="text-gray-500">ID: <span className="font-mono text-slate-300">{order.id.slice(0, 8)}...</span></span>
                      <span className="text-gray-500">{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-xs text-gray-300">
                          <span>{item.stockItem.scryfallCard.name} <span className="text-gray-500">x{item.quantity}</span></span>
                          <span className="font-mono">€{((item.priceAtPurchase ?? 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        order.status === "CONFIRMED" ? "bg-green-950 text-green-400" :
                        order.status === "PENDING" ? "bg-yellow-950 text-yellow-400" :
                        "bg-red-950 text-red-400"
                      }`}>
                        {order.status}
                      </span>
                      <span className="font-bold text-white text-sm font-mono">
                        Total: €{order.totalPrice?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
 
        </div>
      </div>
    </div>
  );
}
