"use client";

import { useTransition } from "react";
import { leaveTournamentAction } from "@/app/actions/deck-actions";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

export default function LeaveTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLeave = () => {
    if (confirm("¿Seguro que deseas salir de este torneo? Tendrás que volver a registrar tu mazo si deseas volver a entrar.")) {
      startTransition(async () => {
        const res = await leaveTournamentAction(tournamentId);
        if (res.success) {
          alert(res.message);
          router.push("/player/tournaments");
        } else {
          alert(res.message);
        }
      });
    }
  };

  return (
    <Button
      onClick={handleLeave}
      disabled={isPending}
      className="border-red-900/50 hover:bg-red-900/20 hover:text-red-400 text-red-500 font-semibold text-sm py-2 px-4 border rounded-lg transition-colors cursor-pointer"
    >
      {isPending ? "Saliendo..." : "Abandonar Torneo"}
    </Button>
  );
}
