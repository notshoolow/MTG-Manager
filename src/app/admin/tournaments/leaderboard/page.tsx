import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
 
export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: Promise<{ sortBy?: string; order?: string }>
}) {
  const params = await searchParams;
  const sortBy = params.sortBy || 'prizes';
  const order = params.order || 'desc';
  const isAsc = order === 'asc';
 
  const players = await prisma.user.findMany({
    where: { role: 'PLAYER' },
    include: {
      _count: {
        select: {
          registrations: true,
          prizes: true
        }
      },
      prizes: {
        include: { tournament: true }
      }
    }
  });
 
  // Lógica de ordenación basada en parámetros
  const sortedPlayers = [...players].sort((a, b) => {
    let primaryA = 0;
    let primaryB = 0;
    let secondaryA = 0;
    let secondaryB = 0;
 
    if (sortBy === 'events') {
      primaryA = a._count.registrations;
      primaryB = b._count.registrations;
      secondaryA = a._count.prizes;
      secondaryB = b._count.prizes;
    } else {
      // Criterio predeterminado: premios
      primaryA = a._count.prizes;
      primaryB = b._count.prizes;
      secondaryA = a._count.registrations;
      secondaryB = b._count.registrations;
    }
 
    if (primaryA !== primaryB) {
      return isAsc ? primaryA - primaryB : primaryB - primaryA;
    }
    // El criterio de desempate siempre es descendente para garantizar estabilidad
    return secondaryB - secondaryA;
  });
 
  const getSortHref = (newSortBy: string) => {
    const newOrder = (sortBy === newSortBy && order === 'desc') ? 'asc' : 'desc';
    return `/admin/leaderboard?sortBy=${newSortBy}&order=${newOrder}`;
  };
 
  const SortArrow = ({ column }: { column: string }) => {
    if (sortBy !== column) return <span className="text-gray-600 ml-1 opacity-20 transition-none">↕</span>;
    return <span className="text-indigo-400 ml-1 transition-none">{order === 'desc' ? '▼' : '▲'}</span>;
  };
 
  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8 mt-8">
        <header className="flex flex-col gap-2 mb-2">
          <Link href="/admin/tournaments" className="text-gray-400 hover:text-white transition text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Player Leaderboard</h1>
          <p className="text-gray-400 text-sm italic">Review player performance and participation across all events.</p>
        </header>
 
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-semibold w-20">Rank</th>
                  <th className="pb-3 px-4 font-semibold w-auto">Player</th>
                  <th className="pb-3 px-4 font-semibold text-center w-36 cursor-pointer group">
                    <Link 
                      href={getSortHref('events')} 
                      className="flex items-center justify-center gap-1 w-full h-full outline-none focus:ring-0 focus:outline-none group-hover:text-white transition-colors"
                    >
                      Events <SortArrow column="events" />
                    </Link>
                  </th>
                  <th className="pb-3 pl-4 font-semibold text-right w-40 cursor-pointer group">
                    <Link 
                      href={getSortHref('prizes')} 
                      className="flex items-center justify-end gap-1 w-full h-full outline-none focus:ring-0 focus:outline-none group-hover:text-white transition-colors"
                    >
                      Total Prizes <SortArrow column="prizes" />
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500 italic">No player data available.</td>
                  </tr>
                ) : (
                  sortedPlayers.map((player, index) => (
                    <tr key={player.id} className="text-gray-300 hover:bg-white/5">
                      <td className="py-5 pr-4">
                        {index < 3 ? (
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm shadow-md ${
                            index === 0 ? 'bg-amber-500 text-black shadow-amber-500/20' : 
                            index === 1 ? 'bg-slate-300 text-black shadow-slate-300/20' : 
                            'bg-orange-600 text-white shadow-orange-600/20'
                          }`}>
                            {index + 1}
                          </div>
                        ) : (
                          <div className="pl-3 text-gray-500 font-mono text-sm">#{index + 1}</div>
                        )}
                      </td>
                      <td className="py-5 px-4 truncate">
                        <div className="font-bold text-white text-base truncate">{player.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">{player.email}</div>
                      </td>
                      <td className={`py-5 px-4 text-center ${sortBy === 'events' ? 'bg-white/5 text-white' : 'text-indigo-400'}`}>
                         <span className="text-lg font-bold font-mono leading-none">
                           {player._count.registrations}
                         </span>
                         <span className="text-[10px] text-gray-500 block uppercase tracking-tighter mt-1">Tournaments</span>
                      </td>
                      <td className={`py-5 pl-4 text-right ${sortBy === 'prizes' ? 'bg-white/5 text-white' : 'text-gray-300'}`}>
                          <div className="flex items-center justify-end gap-2">
                             <span className="text-2xl font-black leading-none">
                               {player._count.prizes}
                             </span>
                             <span className={`text-xl ${sortBy === 'prizes' ? 'opacity-100' : 'opacity-40 grayscale'}`}>🏆</span>
                          </div>
                         <span className="text-[10px] text-gray-500 block uppercase tracking-tighter mr-6 mt-1">Earned</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
