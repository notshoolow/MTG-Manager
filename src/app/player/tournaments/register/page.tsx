import { prisma } from "@/lib/db";
import RegistrationForm from "./RegistrationForm";
import Link from "next/link";



export default async function PlayerRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const initialTournamentId = typeof params.tournamentId === "string" ? params.tournamentId : undefined;
  const tournaments = await prisma.tournament.findMany({
    where: { status: "UPCOMING" },
    select: { id: true, name: true, format: true, date: true }
  });

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-md w-full space-y-6 mt-8">
        
        <header className="flex flex-col gap-2 mb-8">
          <Link href="/player/tournaments" className="text-gray-400 hover:text-white transition text-sm">
            &larr; Back to Hub
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Player Registration</h1>
            <p className="text-gray-400 text-sm italic">Select an event and submit your deck URL.</p>
          </div>
        </header>

        <RegistrationForm tournaments={tournaments} initialTournamentId={initialTournamentId} />
      </div>
    </div>
  );
}
