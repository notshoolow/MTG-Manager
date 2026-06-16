import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import ProfileEditor from "@/components/player/ProfileEditor";
import { getMockUserId } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function PlayerDashboard() {
  const mockUserId = await getMockUserId();
  const user = await prisma.user.findUnique({
    where: { id: mockUserId },
    include: {
      prizes: { include: { tournament: true } },
      registrations: {
        include: {
          tournament: true,
          _count: { select: { matchPlayers: true } }
        }
      }
    }
  });

  if (!user) {
    return notFound();
  }

  // Eventos activos: próximos (UPCOMING) o en curso (ONGOING)
  const activeRegistrations = user.registrations.filter(r => 
    r.tournament.status !== "COMPLETED"
  );

  // Historial de eventos pasados: finalizados (COMPLETED)
  const tournamentHistory = user.registrations.filter(r => 
    r.tournament.status === "COMPLETED"
  );

  // Torneos disponibles para inscripción
  const upcomingTournaments = await prisma.tournament.findMany({
    where: {
      status: 'UPCOMING',
      registrations: {
        none: {
          userId: user.id
        }
      }
    }
  });

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6 mt-8">
        <header className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white transition">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Player Hub</h1>
        </header>

        <Card>
          <ProfileEditor user={user} />
        </Card>

        {/* SECCIÓN DE NUEVOS EVENTOS */}
        <Card>
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
            <CardTitle className="mb-0">Join a New Event</CardTitle>
            <Link href="/player/tournaments/register">
              <Button variant="primary" className="text-xs py-1.5 px-4 shadow-md shadow-indigo-900/20">All Events</Button>
            </Link>
          </div>
          {upcomingTournaments.length > 0 ? (
            <div className="space-y-3">
              {upcomingTournaments.map(t => (
                <div key={t.id} className="p-3 bg-gray-900/60 border border-gray-700/80 rounded-lg flex justify-between items-center hover:border-gray-600 transition-colors">
                  <div>
                    <h4 className="text-white font-medium">{t.name}</h4>
                    <span className="text-xs text-indigo-300 font-semibold tracking-wide uppercase">{t.format}</span>
                    {t.date && <span className="text-xs text-gray-400 ml-2">({new Date(t.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})</span>}
                  </div>
                  <Link href={`/player/tournaments/register?tournamentId=${t.id}`}>
                    <Button variant="secondary" className="text-xs px-4">Join</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500 text-sm">
              No new upcoming events available to join right now.
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Your Active Events</CardTitle>
          {activeRegistrations.length > 0 ? (
            <div className="mt-4 space-y-4">
              {activeRegistrations.map(reg => (
                <Link href={`/player/tournaments/tournament/${reg.tournamentId}`} key={reg.id} className="block group">
                  <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg flex justify-between items-center group-hover:border-[var(--color-indigo-accent)]/50 transition-colors">
                    <div>
                      <h3 className="text-white font-medium group-hover:text-[var(--color-indigo-accent)] transition-colors">{reg.tournament.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Format: {reg.tournament.format}
                        {reg.tournament.date && <span className="ml-3">• {new Date(reg.tournament.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${
                        reg.tournament.status === 'ONGOING' 
                          ? 'bg-green-900/40 text-green-400 border-green-800' 
                          : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
                      }`}>
                        {reg.tournament.status}
                      </span>
                      <p className="text-sm text-gray-400 mt-1">Score: {reg.score}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>You are not currently active in any events.</p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Rewards & Prizes</CardTitle>
          {user.prizes.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.prizes.map((prize) => (
                <div key={prize.id} className="p-4 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-lg flex items-center shadow shadow-indigo-900/20 hover:scale-[1.02] transition-transform">
                  <div className="h-12 w-12 rounded bg-indigo-950 flex items-center justify-center text-2xl mr-4 shadow-inner border border-indigo-800/50">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-sm">{prize.name}</h3>
                      {(prize as any).place && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded leading-none uppercase tracking-tighter ${
                          (prize as any).place === 1 ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                          (prize as any).place === 2 ? 'bg-slate-300 text-black' :
                          (prize as any).place === 3 ? 'bg-orange-600 text-white' :
                          'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {(prize as any).place}º
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{prize.tournament?.name || "Manual Reward"}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{new Date(prize.awardedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500 text-sm">
              <span className="text-2xl mb-2 block opacity-50">🏆</span>
              You have not earned any prizes yet. Join tournaments to earn rewards!
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Tournament History</CardTitle>
          {tournamentHistory.length > 0 ? (
            <div className="mt-4 space-y-4">
              {tournamentHistory.map(reg => (
                <Link href={`/player/tournaments/history/${reg.tournamentId}`} key={reg.id} className="block group">
                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg group-hover:border-[var(--color-indigo-accent)]/50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-white font-medium group-hover:text-[var(--color-indigo-accent)] transition-colors">{reg.tournament.name}</h3>
                      <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        {new Date(reg.tournament.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <div><span className="text-gray-500">Format: </span>{reg.tournament.format}</div>
                      <div><span className="text-gray-500">Final Score: </span>{reg.score}</div>
                      <div><span className="text-gray-500">Matches Played: </span>{reg._count.matchPlayers}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
             <div className="py-4 text-center text-gray-500 text-sm">
              No tournament history found.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
