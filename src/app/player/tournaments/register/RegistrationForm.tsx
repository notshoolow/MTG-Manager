"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { validateAndRegisterDeck } from "@/app/actions/deck-actions";
import { useRouter } from "next/navigation";

export default function RegistrationForm({ tournaments, initialTournamentId }: { tournaments: any[], initialTournamentId?: string }) {
  const [deckUrl, setDeckUrl] = useState("");
  const [tournamentId, setTournamentId] = useState(initialTournamentId || (tournaments.length > 0 ? tournaments[0].id : ""));
  const [status, setStatus] = useState<"idle" | "validating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTournament = tournaments.find(t => t.id === tournamentId);
    const requiresDeck = selectedTournament && !["DRAFT", "SEALED"].includes(selectedTournament.format);
    
    if (requiresDeck && !deckUrl) return;
    
    setStatus("validating");
    setMessage("Analyzing deck legality and cost via Moxfield...");
    
    try {
      let res: any = { success: true, message: "Registered for limited event." };
      if (requiresDeck) {
          if (!deckUrl.includes("moxfield.com/decks")) {
              setStatus("error");
              setMessage("URL must be a valid Moxfield deck link.");
              return;
          }
          res = await validateAndRegisterDeck(tournamentId, deckUrl);
      } else {
          res = await validateAndRegisterDeck(tournamentId, "");
      }
      
      if (res.success) {
        setStatus("success");
        setMessage(res.message || "Deck valid! You are registered for the event.");
        setTimeout(() => {
          router.push('/player/tournaments');
        }, 2000);
      } else {
        setStatus("error");
        setMessage(res.message || "Validation failed.");
      }
    } catch (e: any) {
      setStatus("error");
      setMessage("Validation request failed.");
    }
  }

  if (tournaments.length === 0) {
     return <div className="text-gray-400 text-center py-8">No upcoming events are currently open for registration.</div>;
  }

  const selectedTournament = tournaments.find(t => t.id === tournamentId);
  const requiresDeck = selectedTournament && !["DRAFT", "SEALED"].includes(selectedTournament.format);

  return (
    <Card>
      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label htmlFor="tournament" className="block text-sm font-medium text-gray-300 mb-2">Select Event</label>
          <select
             id="tournament"
             required
             value={tournamentId}
             onChange={e => setTournamentId(e.target.value)}
             className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none"
          >
             {tournaments.map(t => (
               <option key={t.id} value={t.id}>
                 {t.name} ({t.format}) {t.date ? ` - ${new Date(t.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : ''}
               </option>
             ))}
          </select>
        </div>

        {requiresDeck && (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">Moxfield Deck URL</label>
            <input 
              required={requiresDeck} 
              type="url" 
              id="url" 
              value={deckUrl}
              onChange={e => setDeckUrl(e.target.value)}
              placeholder="https://moxfield.com/decks/..." 
              className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none transition" 
            />
          </div>
        )}
        
        {status !== "idle" && (
          <div className={`p-4 rounded-lg text-sm flex flex-col gap-2 ${status === 'error' ? 'bg-[var(--color-dispute)]/20 text-[var(--color-dispute)]' : status === 'success' ? 'bg-[var(--color-valid)]/20 text-[var(--color-valid)]' : 'bg-gray-800 text-gray-300'}`}>
            <div className="flex items-center gap-2">
              {status === "validating" && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
              {message}
            </div>
          </div>
        )}
        
        <Button 
            variant="primary" 
            type="submit" 
            className="w-full py-3 mt-4"
            disabled={status === "validating" || status === "success"}
        >
          {status === "validating" ? "Processing..." : status === "success" ? "Registered" : (requiresDeck ? "Register Deck" : "Register for Event")}
        </Button>
      </form>
    </Card>
  );
}
