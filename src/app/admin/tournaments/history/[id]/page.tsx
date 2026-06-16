import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EventHistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: { 
        include: { user: true },
        orderBy: { score: "desc" }
      },
      matches: {
        include: { 
          matchPlayers: { 
            include: { registration: { include: { user: true } } } 
          } 
        },
        orderBy: [
          { roundNumber: "asc" },
          { tableNumber: "asc" }
        ]
      },
      awardedPrizes: {
        include: { user: true }
      }
    }
  });

  if (!tournament || tournament.status !== "COMPLETED") {
    // Si el torneo no ha finalizado, se podría considerar la redirección al panel de control activo.
    // No obstante, por el momento, una respuesta de recurso no encontrado (404) es suficiente.
    return notFound();
  }

  const { registrations, matches, awardedPrizes } = tournament;

  // Agrupación de enfrentamientos ordenados por ronda
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.roundNumber]) {
      acc[match.roundNumber] = [];
    }
    acc[match.roundNumber].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-8 mt-8">
        <header className="flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-2 mb-2">
              <Link href="/admin/tournaments/history" className="text-gray-400 hover:text-white transition text-sm">
                &larr; Back to History
              </Link>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight">{tournament.name}</h1>
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span className="px-3 py-1 bg-gray-800 rounded-full">Format: {tournament.format}</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full">Date: {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'N/A'}</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full">Players: {registrations.length}</span>
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Clasificación General / Clasificación Final */}
          <Card>
            <CardTitle>Final Classification</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 px-4 font-medium">Player</th>
                    <th className="pb-3 pl-4 font-medium text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {registrations.map((reg, index) => (
                    <tr key={reg.id} className="text-gray-300 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                          index === 0 ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                          index === 1 ? 'bg-slate-300 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-800 text-gray-500 font-medium'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {reg.user.name}
                      </td>
                      <td className="py-3 pl-4 text-right tabular-nums">
                        {reg.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Premios Concedidos */}
          <div className="space-y-8">
            <Card>
              <CardTitle>Awarded Prizes</CardTitle>
              {awardedPrizes.length === 0 ? (
                <p className="text-gray-500 italic">No prizes were awarded in this event.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {awardedPrizes.map((prize) => (
                    <li key={prize.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {prize.place && (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black ${
                            prize.place === 1 ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                            prize.place === 2 ? 'bg-slate-300 text-black' :
                            prize.place === 3 ? 'bg-orange-600 text-white' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {prize.place}º
                          </span>
                        )}
                        <div>
                          <p className="text-white font-bold text-sm tracking-tight">{prize.name}</p>
                          <p className="text-xs text-gray-500">Won by: {prize.user.name}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {new Date(prize.awardedAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Ficha de Información General si fuera necesario o estadísticas adicionales */}
            <Card>
               <CardTitle>Event Info</CardTitle>
               <div className="space-y-3 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-500">Total Rounds Played</span>
                   <span className="text-white font-medium">{tournament.currentRound}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Pairing Mode</span>
                   <span className="text-white font-medium capitalize">{tournament.pairingMode}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Event Created</span>
                   <span className="text-white font-medium">{new Date(tournament.createdAt).toLocaleDateString()}</span>
                 </div>
               </div>
            </Card>
          </div>
        </div>

        {/* Historial de Enfrentamientos */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Full Pairing History</h2>
          {Object.keys(matchesByRound).length === 0 ? (
            <p className="text-gray-500 italic">No match records found.</p>
          ) : (
            Object.keys(matchesByRound).sort((a,b) => Number(a) - Number(b)).map((round) => (
              <div key={round} className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--color-indigo-accent)]">Round {round}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matchesByRound[Number(round)].map((m) => (
                    <div key={m.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-500 mb-2">Table {m.tableNumber}</div>
                      <ul className="space-y-2">
                        {m.matchPlayers.map((mp) => (
                          <li key={mp.id} className="flex justify-between items-center">
                            <span className="text-sm text-gray-300">{mp.registration.user.name}</span>
                            <span className="text-sm text-white font-medium">{mp.points} pts</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
