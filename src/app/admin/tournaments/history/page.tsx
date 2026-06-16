import { prisma } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function AdminHistory() {
  const pastEvents = await prisma.tournament.findMany({
    where: { status: "COMPLETED" },
    include: {
      _count: {
        select: { registrations: true }
      }
    },
    orderBy: { date: "desc" }
  });

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-6xl w-full space-y-8 mt-8">
        <header className="flex justify-between items-center">
          <div>
            <div className="flex flex-col gap-2 mb-2">
              <Link href="/admin/tournaments" className="text-gray-400 hover:text-white transition text-sm">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Tournament History</h1>
            </div>
            <p className="text-gray-400">View results from your past events.</p>
          </div>
        </header>

        <Card>
          <CardTitle>Past Events</CardTitle>
          {pastEvents.length === 0 ? (
            <p className="text-gray-500 italic">No past events found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="pb-3 pr-4 font-medium">Event Name</th>
                    <th className="pb-3 px-4 font-medium">Date</th>
                    <th className="pb-3 px-4 font-medium">Format</th>
                    <th className="pb-3 px-4 font-medium">Players</th>
                    <th className="pb-3 pl-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {pastEvents.map((event) => (
                    <tr key={event.id} className="group hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 pr-4">
                        <span className="text-white font-medium">{event.name}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300 text-sm">{event.format}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300 text-sm">{event._count.registrations}</span>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <Link href={`/admin/tournaments/history/${event.id}`}>
                          <Button variant="secondary" className="text-xs">
                            View Results
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
