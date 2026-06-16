import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { prisma } from "@/lib/db";



export default async function AdminDashboard() {
  const upcomingTournaments = await prisma.tournament.findMany({
    where: { status: "UPCOMING" },
    include: { _count: { select: { registrations: true } } }
  });

  const ongoingTournaments = await prisma.tournament.findMany({
    where: { status: "ONGOING" },
  });

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Store Admin Dashboard</h1>
            <p className="text-gray-400">Manage your tournaments and players.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/admin/tournaments/leaderboard">
              <Button variant="secondary" className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                Leaderboard
              </Button>
            </Link>
            <Link href="/admin/tournaments/history">
              <Button variant="secondary" className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Past Events
              </Button>
            </Link>
            <Link href="/admin/tournaments/tournament/new">
              <Button variant="primary" className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                New Tournament
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardTitle>Ongoing Events</CardTitle>
            {ongoingTournaments.length === 0 ? (
              <p className="text-gray-500 italic">No active tournaments right now.</p>
            ) : (
              <ul className="space-y-4">
                {ongoingTournaments.map(t => (
                  <li key={t.id} className="p-4 bg-[var(--color-background)] rounded-lg border border-gray-800 flex justify-between items-center group hover:border-green-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                      <div>
                        <h3 className="text-lg font-medium text-white">{t.name}</h3>
                        <p className="text-sm text-gray-500 font-mono tracking-tight uppercase">Round {t.currentRound} • {t.format}</p>
                      </div>
                    </div>
                    <Link href={`/admin/tournaments/tournament/${t.id}`}>
                      <Button variant="secondary" className="text-sm">Manage</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
 
          <Card>
            <CardTitle>Upcoming Events</CardTitle>
            {upcomingTournaments.length === 0 ? (
              <p className="text-gray-500 italic">No upcoming tournaments.</p>
            ) : (
              <ul className="space-y-4">
                {upcomingTournaments.map(t => (
                  <li key={t.id} className="p-4 bg-[var(--color-background)] rounded-lg border border-gray-800 flex justify-between items-center group hover:border-yellow-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></div>
                      <div>
                        <h3 className="text-lg font-medium text-white">{t.name}</h3>
                        <p className="text-sm text-gray-500">
                          {t.format} • {t._count.registrations} registered
                          {t.date && <span className="ml-2">• {new Date(t.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/tournaments/tournament/${t.id}`}>
                      <Button variant="secondary" className="text-sm">View</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
