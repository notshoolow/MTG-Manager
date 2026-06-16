import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import RoundTimer from "@/components/tournament/RoundTimer";
import MatchReporter from "@/components/tournament/MatchReporter";
import { calculateStandingsAction } from "@/lib/standings";
import { getMockUserId } from "@/lib/auth";
import LeaveTournamentButton from "@/components/player/LeaveTournamentButton";
 
export default async function PlayerTournamentDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const mockUserId = await getMockUserId();
  const user = await prisma.user.findUnique({ where: { id: mockUserId } });
  if (!user) return notFound();
 
  // Recuperación de metadatos y clasificación del torneo (consulta simplificada para optimizar el rendimiento)
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: true },
        orderBy: { score: 'desc' },
      },
      prizes: true,
      missions: true,
    }
  });
 
  if (!tournament) {
    return notFound();
  }
 
  const myRegistration = tournament.registrations.find(r => r.userId === user.id);
  if (!myRegistration) return notFound();
 
  // Recuperación selectiva del enfrentamiento activo del jugador actual en la ronda en curso
  const currentMatchPlayer = await prisma.matchPlayer.findFirst({
    where: {
      registrationId: myRegistration.id,
      match: { tournamentId: id, roundNumber: tournament.currentRound }
    },
    include: {
      match: {
        include: {
          matchPlayers: {
            include: { registration: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } }
          }
        }
      }
    }
  });
 
  const currentMatch = currentMatchPlayer?.match;
  const standings = await calculateStandingsAction(tournament.id);
 
  return (
    <div className="min-h-screen p-6 bg-background flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6 mt-8">
        <header className="flex flex-col gap-2 mb-6">
          <Link href="/player/tournaments" className="text-gray-400 hover:text-white transition text-sm">
            &larr; Back to Hub
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">{tournament.name}</h1>
              <div className="flex gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-gray-800 rounded">{tournament.format}</span>
                <span className="px-2 py-1 bg-gray-800 rounded">Round {tournament.currentRound || 0}</span>
                <span className={`px-2 py-1 rounded font-semibold border ${
                  tournament.status === 'ONGOING' 
                    ? 'bg-green-900/40 text-green-400 border-green-800' 
                    : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
                }`}>
                  {tournament.status}
                </span>
              </div>
            </div>
          </div>
        </header>
 
        {tournament.status === "ONGOING" && tournament.roundStartedAt && (
          <Card className="flex flex-col items-center border-[var(--color-indigo-accent)]/30">
            <h2 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-widest">Time Remaining</h2>
            <RoundTimer roundStartedAt={tournament.roundStartedAt.toISOString()} roundTimer={tournament.roundTimer} />
          </Card>
        )}
 
        {tournament.status === "UPCOMING" && (
          <Card className="text-center py-8 flex flex-col items-center">
             <div className="text-4xl mb-4 text-gray-600">⏳</div>
             <CardTitle>Tournament has not started yet</CardTitle>
             <p className="text-gray-400 text-sm mb-6">Wait for the admin to generate the first round pairings.</p>
             <LeaveTournamentButton tournamentId={id} />
          </Card>
        )}
 
        {currentMatch && (
            <Card>
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <div>
                  <CardTitle className="mb-0 text-[var(--color-indigo-accent)]">Your Current Match</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">Round {currentMatch.roundNumber} - Table {currentMatch.tableNumber}</p>
                </div>
                <div className="px-3 py-1 bg-gray-900 rounded font-mono text-sm text-gray-300 border border-gray-700">
                  Table {currentMatch.tableNumber}
                </div>
              </div>
              
              <div className="space-y-4">
                 <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Opponents</h3>
                 <div className="grid gap-3">
                   {currentMatch.matchPlayers.map(mp => {
                     const isMe = mp.registrationId === myRegistration.id;
                     return (
                       <div key={mp.id} className={`p-4 rounded-lg flex items-center gap-4 ${isMe ? 'bg-indigo-950/30 border border-indigo-900/50' : 'bg-gray-900 border border-gray-800'}`}>
                         <div className="h-10 w-10 min-w-10 rounded bg-gray-800 flex items-center justify-center font-bold text-gray-400 overflow-hidden">
                            {mp.registration.user.avatarUrl ? (
                              <img src={mp.registration.user.avatarUrl} alt={mp.registration.user.name} className="h-full w-full object-cover" />
                            ) : (
                              mp.registration.user.name.charAt(0).toUpperCase()
                            )}
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                              <p className={`font-medium ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                                {mp.registration.user.name}
                              </p>
                              {isMe && <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded">You</span>}
                           </div>
                           <p className="text-xs text-gray-500">Points: {mp.points + mp.customMissions}</p>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              </div>
              
              
              <MatchReporter 
                matchId={currentMatch.id}
                myRegistrationId={myRegistration.id}
                matchPlayers={currentMatch.matchPlayers}
                matchStatus={currentMatch.status}
                myStatus={currentMatchPlayer?.status || "PENDING"}
                isCommander={tournament.format === 'COMMANDER'}
                missions={tournament.missions}
              />
             </Card>
        )}
 
        {/* Tarjeta de Clasificación del Torneo */}
        <Card>
          <CardTitle className="text-sm uppercase tracking-wider text-gray-400">Current Standings</CardTitle>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-[10px] uppercase tracking-widest">
                  <th className="pb-2 pr-2">Pos</th>
                  <th className="pb-2 px-2">Player</th>
                  <th className="pb-2 px-2 text-right">OMWP</th>
                  <th className="pb-2 pl-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {standings.map((reg, index) => {
                   const isMe = reg.registrationId === myRegistration.id;
                   return (
                  <tr key={reg.registrationId} className={`text-sm ${isMe ? 'bg-indigo-500/5' : ''} ${reg.isDropped ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 pr-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                        index === 0 ? 'bg-amber-500 text-black' :
                        index === 1 ? 'bg-slate-300 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        isMe ? 'text-indigo-400' : 'text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className={`py-2.5 px-2 font-medium ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                      {reg.name}
                      {isMe && <span className="ml-2 text-[8px] uppercase text-indigo-500 border border-indigo-500/30 px-1 rounded">You</span>}
                      {reg.isDropped && <span className="ml-2 text-[8px] uppercase text-red-500 border border-red-500/30 px-1 rounded">Dropped</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-500 text-xs">{(reg.omwp * 100).toFixed(1)}%</td>
                    <td className={`py-2.5 pl-2 text-right font-mono tabular-nums ${isMe ? 'text-indigo-400' : 'text-gray-400'}`}>
                      {reg.score}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </Card>
 
        {/* Detalles del Torneo: Premios y Misiones */}
        <div className="grid gap-6">
           <Card>
              <CardTitle className="text-sm uppercase tracking-wider text-gray-400">Prizes</CardTitle>
              {tournament.prizes.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No prize information available.</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {tournament.prizes.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                      <span className="text-white font-medium">{p.name}</span>
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 font-mono">
                        {p.startPlace === p.endPlace ? `Place ${p.startPlace}` : `Places ${p.startPlace}-${p.endPlace}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
           </Card>
 
           {tournament.format === 'COMMANDER' && (
             <Card>
                <CardTitle className="text-sm uppercase tracking-wider text-gray-400">How to score points</CardTitle>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="flex-1">
                       <span className="text-white font-medium">Placement Points</span>
                       <p className="text-xs text-gray-500 mt-1">Points based on your finishing position in the pod.</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-xs text-gray-300">1st: {tournament.firstPlacePoints || 4} pts</span>
                       <span className="text-xs text-gray-400">2nd: {tournament.secondPlacePoints || 3} pts</span>
                    </div>
                  </div>
                  
                  {tournament.missions.length > 0 && (
                    <div className="pt-2">
                       <h4 className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-widest">Achievement Missions</h4>
                       <div className="grid gap-2">
                          {tournament.missions.map(m => (
                            <div key={m.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                               <span className="text-xs text-gray-300 flex-1">{m.description}</span>
                               <span className="text-xs text-[var(--color-indigo-accent)] font-bold ml-4">+{m.points} pts</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
