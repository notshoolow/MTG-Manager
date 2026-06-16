import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMockUserId } from "@/lib/auth";

export default async function PlayerEventHistoryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mockUserId = await getMockUserId();
  const user = await prisma.user.findUnique({ where: { id: mockUserId } });
  if (!user) return notFound();

  // 1. Recuperación de metadatos y clasificación general del torneo (sin emparejamientos de partidas)
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { score: "desc" },
      },
      prizes: true,
      missions: true,
    }
  });

  if (!tournament || tournament.status !== "COMPLETED") {
    return notFound();
  }

  // 2. Validación de la participación del jugador actual en el torneo
  const myRegistration = tournament.registrations.find(r => r.userId === user.id);
  if (!myRegistration) {
    return (
      <div className="min-h-screen p-8 bg-background flex flex-col items-center justify-center">
         <h1 className="text-2xl font-bold text-white mb-4">Unauthorized</h1>
         <p className="text-gray-400 mb-6">You can only view history for tournaments you participated in.</p>
         <Link href="/player/tournaments">
            <button className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition">Back to Hub</button>
         </Link>
      </div>
    );
  }

  // 3. Recuperación exclusiva de los enfrentamientos del torneo con proyección estricta de campos
  //    Se seleccionan únicamente los atributos necesarios para el renderizado para evitar sobrecarga.
  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    select: {
      id: true,
      roundNumber: true,
      tableNumber: true,
      status: true,
      matchPlayers: {
        select: {
          id: true,
          registrationId: true,
          points: true,
          registration: {
            select: {
              user: { select: { id: true, name: true } }
            }
          }
        }
      }
    },
    orderBy: [
      { roundNumber: "asc" },
      { tableNumber: "asc" },
    ],
  });

  // 4. Consulta de los premios adjudicados a este jugador en el torneo
  const myPrizes = await prisma.userPrize.findMany({
    where: { userId: user.id, tournamentId: id },
  });

  const { registrations } = tournament;

  // Agrupación de enfrentamientos indexados por ronda
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.roundNumber]) {
      acc[match.roundNumber] = [];
    }
    acc[match.roundNumber].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8 mt-8">
        <header className="flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-2 mb-2">
              <Link href="/player/tournaments" className="text-gray-400 hover:text-white transition text-sm">
                &larr; Back to Hub
              </Link>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight">{tournament.name}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="px-3 py-1 bg-gray-800 rounded-full">Format: {tournament.format}</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full">Date: {tournament.date ? new Date(tournament.date).toLocaleDateString() : 'N/A'}</span>
              <span className="px-3 py-1 bg-indigo-900/30 text-indigo-300 rounded-full border border-indigo-800/50">Your final score: {myRegistration.score} pts</span>
            </div>
          </div>
        </header>

        {myPrizes.length > 0 && (
           <Card className="bg-gradient-to-r from-amber-900/20 to-indigo-900/20 border-amber-500/30 shadow-lg shadow-amber-950/10">
              <div className="flex items-center gap-4">
                 <div className="text-4xl">🏆</div>
                 <div>
                    <h2 className="text-xl font-bold text-amber-200">Congratulations!</h2>
                    <p className="text-sm text-gray-300">You won the following prize(s):</p>
                     <div className="flex gap-2 mt-2">
                        {myPrizes.map(p => (
                          <span key={p.id} className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1.5 ${
                            p.place === 1 ? 'bg-amber-500 text-black border-amber-600 shadow-amber-500/20' :
                            p.place === 2 ? 'bg-slate-300 text-black border-slate-400 shadow-slate-300/10' :
                            p.place === 3 ? 'bg-orange-600 text-white border-orange-700 shadow-orange-600/10' :
                            'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                             {p.name} {p.place ? <span className="opacity-70 font-bold">{p.place}º</span> : ''}
                          </span>
                        ))}
                     </div>
                 </div>
              </div>
           </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Clasificación Final */}
          <Card>
            <CardTitle>Final Classification</CardTitle>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="pb-3 pr-4 font-medium w-10">Place</th>
                    <th className="pb-3 px-4 font-medium">Player</th>
                    <th className="pb-3 pl-4 font-medium text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {registrations.map((reg, index) => {
                    const isMe = reg.userId === user.id;
                    return (
                    <tr key={reg.id} className={`${isMe ? 'bg-[var(--color-indigo-accent)]/10 text-white font-bold' : 'text-gray-400'} hover:bg-gray-800/30 transition-colors`}>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                          index === 0 ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                          index === 1 ? 'bg-slate-300 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        {reg.user.name}
                        {isMe && <span className="text-[10px] uppercase tracking-tighter bg-[var(--color-indigo-accent)] text-white px-1 rounded">You</span>}
                      </td>
                      <td className="py-3 pl-4 text-right tabular-nums">
                        {reg.score}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-8">
             {/* Información del Torneo */}
             <Card>
                <CardTitle>Tournament Details</CardTitle>
                <div className="space-y-4 mt-4">
                   {tournament.prizes.length > 0 && (
                     <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Prizes</h4>
                        <div className="grid gap-2">
                           {tournament.prizes.map(p => (
                              <div key={p.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-800 text-sm">
                                 <span className="text-gray-300">{p.name}</span>
                                 <span className="text-xs text-gray-500 font-mono">
                                    {p.startPlace === p.endPlace ? `Place ${p.startPlace}` : `Places ${p.startPlace}-${p.endPlace}`}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                   {tournament.format === 'COMMANDER' && tournament.missions.length > 0 && (
                      <div>
                         <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Achievement Missions</h4>
                         <div className="grid gap-2">
                            {tournament.missions.map(m => (
                               <div key={m.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-800 text-xs">
                                  <span className="text-gray-400">{m.description}</span>
                                  <span className="text-[var(--color-indigo-accent)] font-bold">+{m.points}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             </Card>

             {/* Estadísticas Personales */}
             <Card>
                <CardTitle>Your Record</CardTitle>
                <div className="grid grid-cols-2 gap-4 mt-4">
                   <div className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Total Points</p>
                      <p className="text-2xl font-bold text-white">{myRegistration.score}</p>
                   </div>
                   <div className="p-3 bg-gray-900 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">Rank</p>
                      <p className="text-2xl font-bold text-[var(--color-indigo-accent)]">
                         #{registrations.findIndex(r => r.userId === user.id) + 1}
                      </p>
                   </div>
                </div>
             </Card>
          </div>
        </div>

        {/* Historial de Emparejamientos */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Match History</h2>
          <p className="text-sm text-gray-400">Review your journey through the tournament.</p>
          
          {Object.keys(matchesByRound).length === 0 ? (
            <p className="text-gray-500 italic">No match records found.</p>
          ) : (
            <div className="space-y-8">
              {Object.keys(matchesByRound).sort((a,b) => Number(a) - Number(b)).map((round) => {
                const roundMatches = matchesByRound[Number(round)];
                const myMatch = roundMatches.find(m => m.matchPlayers.some(mp => mp.registrationId === myRegistration.id));
                
                return (
                <div key={round} className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--color-indigo-accent)] border-l-4 border-[var(--color-indigo-accent)] pl-3">Round {round}</h3>
                  
                  {myMatch && (
                     <div className="p-5 bg-indigo-950/20 border-2 border-indigo-500/30 rounded-xl shadow-lg ring-1 ring-indigo-500/20">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest bg-indigo-900/50 px-3 py-1 rounded-full">Your Match • Table {myMatch.tableNumber}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {myMatch.matchPlayers.map(mp => {
                              const isMe = mp.registrationId === myRegistration.id;
                              const playerName = mp.registration?.user?.name ?? "Unknown";
                              return (
                                 <div key={mp.id} className={`p-4 rounded-lg flex justify-between items-center ${isMe ? 'bg-indigo-500/20 border border-indigo-400/30' : 'bg-gray-800/50 border border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                       <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                          {playerName.charAt(0)}
                                       </div>
                                       <span className={`text-sm ${isMe ? 'text-white font-bold' : 'text-gray-300'}`}>{playerName}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${isMe ? 'text-indigo-300' : 'text-gray-400'}`}>{mp.points} pts</span>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {/* Otros enfrentamientos de la misma ronda */}
                  {roundMatches.filter(m => m.id !== myMatch?.id).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                       {roundMatches.filter(m => m.id !== myMatch?.id).map(m => (
                          <div key={m.id} className="p-3 bg-gray-900/30 border border-gray-800 rounded-lg text-xs">
                             <div className="text-gray-500 mb-2 font-medium">Table {m.tableNumber}</div>
                             <ul className="space-y-1.5">
                                {m.matchPlayers.map(mp => (
                                   <li key={mp.id} className="flex justify-between items-center">
                                      <span className="text-gray-400 truncate pr-2">{mp.registration?.user?.name ?? "Unknown"}</span>
                                      <span className="text-gray-300 font-medium whitespace-nowrap">{mp.points} pts</span>
                                   </li>
                                ))}
                             </ul>
                          </div>
                       ))}
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
