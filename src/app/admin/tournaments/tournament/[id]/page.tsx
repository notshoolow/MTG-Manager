import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startTournamentAction, nextRoundAction, endTournamentAndDistributePrizesAction, registerGuestAction, dropPlayerAction } from "@/app/actions/tournament-actions";
import AdminMatchControls from "@/components/tournament/AdminMatchControls";
import RoundTimer from "@/components/tournament/RoundTimer";
import { calculateStandingsAction } from "@/lib/standings";
 
 
export default async function TournamentDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: { include: { user: true } },
      matches: {
        include: { matchPlayers: { include: { registration: { include: { user: true } } } } }
      },
      prizes: true,
      missions: true
    }
  });
 
  if (!tournament) {
    return notFound();
  }
 
  const { registrations, matches } = tournament;
  const hasIncompleteMatches = matches.some(m => m.roundNumber === tournament.currentRound && m.status !== "COMPLETED");
  const standings = await calculateStandingsAction(tournament.id);
 
  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-8 mt-8">
        
        <header className="flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-2 mb-2">
              <Link href="/admin/tournaments" className="text-gray-400 hover:text-white transition text-sm">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight">{tournament.name}</h1>
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span className="px-3 py-1 bg-gray-800 rounded-full">Format: {tournament.format}</span>
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                tournament.status === 'ONGOING' 
                  ? 'bg-green-900/40 text-green-400 border-green-800' 
                  : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
              }`}>Status: {tournament.status}</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full">Round length: {tournament.roundTimer}m</span>
              <span className="px-3 py-1 bg-gray-800 rounded-full">Registered: {registrations.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {tournament.status === "ONGOING" && tournament.roundStartedAt && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-4">
                    <RoundTimer roundStartedAt={tournament.roundStartedAt.toISOString()} roundTimer={tournament.roundTimer} />
                    {(!tournament.totalRounds || tournament.currentRound < tournament.totalRounds) ? (
                      <form action={async () => {
                        "use server";
                        await nextRoundAction(tournament.id);
                      }}>
                        <Button variant="secondary" disabled={hasIncompleteMatches}>Next Round</Button>
                      </form>
                    ) : (
                      <div className="px-3 py-1 bg-indigo-900/30 text-indigo-400 border border-indigo-800 rounded text-xs font-bold uppercase tracking-wider">
                        Final Round Reached
                      </div>
                    )}
                    <form action={async () => {
                      "use server";
                      await endTournamentAndDistributePrizesAction(tournament.id);
                    }}>
                      <Button variant="danger" disabled={hasIncompleteMatches}>End Tournament</Button>
                    </form>
                  </div>
                  {hasIncompleteMatches && (
                    <p className="text-xs text-red-500 mt-1">Please resolve all active matches first.</p>
                  )}
                </div>
             )}
             {tournament.status === "UPCOMING" && (
                <form action={async () => {
                  "use server";
                  await startTournamentAction(tournament.id);
                }}>
                  <Button variant="primary" disabled={registrations.length < 2}>
                    Start Tournament & Generate Pairings
                  </Button>
                </form>
             )}
          </div>
        </header>
 
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <Card>
            <CardTitle>Registered Players</CardTitle>
            {registrations.length === 0 ? (
              <p className="text-gray-500 italic">No players have registered yet.</p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {registrations.map(reg => (
                  <li key={reg.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium flex items-center gap-2">
                        {reg.user.name}
                        {reg.drop && <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900 uppercase font-bold tracking-wider">Dropped</span>}
                      </p>
                      {reg.deckUrl && (
                         <a href={reg.deckUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-indigo-accent)] font-medium">
                           View Deck
                         </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        reg.deckStatus === 'VALIDATED' ? 'bg-[var(--color-valid)]/20 text-[var(--color-valid)]' : 'bg-gray-700 text-gray-300 font-medium'
                      }`}>
                        {reg.deckStatus}
                      </span>
                      {!reg.drop && tournament.status !== "COMPLETED" && (
                        <form action={async () => {
                          "use server";
                          await dropPlayerAction(reg.id);
                        }}>
                          <Button variant="danger" className="text-[10px] px-2 py-1 h-auto bg-red-950 hover:bg-red-900 text-red-200 border border-red-900">Drop</Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
 
            {tournament.status === "UPCOMING" && (
              <div className="mt-8 pt-6 border-t border-gray-800">
                <h4 className="text-sm font-semibold text-white mb-4">Quick Guest Registration</h4>
                <form action={async (formData: FormData) => {
                  "use server";
                  const name = formData.get("name") as string;
                  const email = formData.get("email") as string;
                  if (name && email) {
                    await registerGuestAction(tournament.id, name, email);
                  }
                }} className="space-y-3">
                  <input name="name" required placeholder="Player Name" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                  <input name="email" required type="email" placeholder="Player Email" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                  <Button variant="secondary" type="submit" className="w-full text-xs">Add Guest Player</Button>
                </form>
              </div>
            )}
          </Card>
 
          <Card>
            <CardTitle>Matches & Pairings</CardTitle>
            {matches.length === 0 ? (
              <p className="text-gray-500 italic">No matches generated.</p>
            ) : (
              <div className="space-y-4">
                {matches.map(m => {
                  const isStale = m.status === "PENDING_CONFIRMATION" && (Date.now() - new Date(m.updatedAt).getTime() > 5 * 60 * 1000);
                  const needsReview = isStale || m.status === "DISPUTED";
                  const isByeMatch = m.matchPlayers.length === 1;
                  return (
                  <div key={m.id} className={`p-4 bg-gray-800/50 rounded-lg border ${needsReview ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-gray-700'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="text-sm font-medium text-white flex items-center gap-2">
                           Round {m.roundNumber} / Table {m.tableNumber}
                           {isByeMatch && <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Bye</span>}
                           {needsReview && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Needs Review</span>}
                         </div>
                         <span className="text-xs text-gray-400">{m.status}</span>
                       </div>
                       {m.status !== 'COMPLETED' && !isByeMatch && (
                         <AdminMatchControls 
                           matchId={m.id} 
                           matchPlayers={m.matchPlayers} 
                           isCommander={tournament.format === 'COMMANDER'}
                           missions={tournament.missions}
                         />
                       )}
                    </div>
                    <ul className="space-y-1">
                      {m.matchPlayers.map(mp => (
                         <li key={mp.id} className="text-sm text-gray-300 flex justify-between items-center">
                            <span>{mp.registration.user.name}</span>
                            <span className="flex items-center gap-2">
                               <span className={`text-[10px] px-1.5 py-0.5 rounded ${mp.status === 'CONFIRMED' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{mp.status}</span>
                               {mp.points + mp.customMissions} pts
                            </span>
                         </li>
                      ))}
                    </ul>
                  </div>
                )})}
              </div>
            )}
          </Card>
 
          <div className="space-y-8">
            <Card>
              <CardTitle>Current Standings</CardTitle>
              <div className="overflow-x-auto">
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
                    {standings.map((reg, index) => (
                      <tr key={reg.registrationId} className={`text-sm ${reg.isDropped ? 'opacity-50' : ''}`}>
                        <td className="py-2 pr-2">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                            index === 0 ? 'bg-amber-500 text-black' :
                            index === 1 ? 'bg-slate-300 text-black' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white font-medium">
                          {reg.name}
                          {reg.isDropped && <span className="ml-2 text-[8px] uppercase text-red-500 border border-red-500/30 px-1 rounded">Dropped</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-gray-500 text-xs">{(reg.omwp * 100).toFixed(1)}%</td>
                        <td className="py-2 pl-2 text-right font-mono text-gray-400 tabular-nums">{reg.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
 
            <Card>
              <CardTitle>Prizes Configuration</CardTitle>
              {tournament.prizes.length === 0 ? (
                <p className="text-gray-500 italic">No prizes configured.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {tournament.prizes.map(p => (
                    <li key={p.id} className="py-3 flex justify-between items-center">
                      <span className="text-white">{p.name}</span>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">
                        Places {p.startPlace}-{p.endPlace}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
 
            {tournament.format === 'COMMANDER' && (
              <Card>
                <CardTitle>Achievement Missions</CardTitle>
                {tournament.missions.length === 0 ? (
                  <p className="text-gray-500 italic">No missions configured.</p>
                ) : (
                  <ul className="divide-y divide-gray-800">
                    {tournament.missions.map(m => (
                      <li key={m.id} className="py-3 flex justify-between items-start">
                        <span className="text-sm text-gray-300 flex-1">{m.description}</span>
                        <span className="text-xs text-[var(--color-indigo-accent)] font-bold">+{m.points} pts</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}
