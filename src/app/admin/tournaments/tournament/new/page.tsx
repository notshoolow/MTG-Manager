"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { createTournamentAction } from "@/app/actions/tournament-actions";

export default function NewTournament() {
  const [name, setName] = useState("");
  const [format, setFormat] = useState("COMMANDER");
  const [timer, setTimer] = useState(50);
  const [date, setDate] = useState("");
  const [roundMode, setRoundMode] = useState<"FIXED" | "ELIMINATION">("FIXED");
  const [totalRounds, setTotalRounds] = useState(3);
  const [pairingMode, setPairingMode] = useState("SWISS");
  
  // Puntos personalizados
  const [firstPlace, setFirstPlace] = useState(4);
  const [secondPlace, setSecondPlace] = useState(3);
  const [thirdPlace, setThirdPlace] = useState(2);
  const [fourthPlace, setFourthPlace] = useState(1);

  // Premios y Misiones
  const [prizes, setPrizes] = useState<{name: string, startPlace: number, endPlace: number, storeCreditAmount?: number}[]>([]);
  const [missions, setMissions] = useState<{description: string, points: number}[]>([]);

  const addPrize = () => setPrizes([...prizes, { name: "", startPlace: 1, endPlace: 1, storeCreditAmount: 0 }]);
  const updatePrize = (index: number, field: string, value: string | number) => {
    const p = [...prizes];
    p[index] = { ...p[index], [field]: value } as any;
    setPrizes(p);
  };
  const removePrize = (index: number) => setPrizes(prizes.filter((_, i) => i !== index));

  const addMission = () => setMissions([...missions, { description: "", points: 1 }]);
  const updateMission = (index: number, field: string, value: string | number) => {
    const m = [...missions];
    m[index] = { ...m[index], [field]: value } as any;
    setMissions(m);
  };
  const removeMission = (index: number) => setMissions(missions.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTournamentAction({
      name,
      format,
      roundTimer: timer,
      date,
      totalRounds: roundMode === "ELIMINATION" ? null : totalRounds,
      pairingMode: roundMode === "ELIMINATION" ? "SWISS" : pairingMode,
      firstPlacePoints: firstPlace,
      secondPlacePoints: secondPlace,
      thirdPlacePoints: thirdPlace,
      fourthPlacePoints: fourthPlace,
      prizes,
      missions
    });
  };

  return (
    <div className="min-h-screen p-8 bg-background flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-6 mt-8">
        
        <header className="flex flex-col gap-2 mb-6">
          <Link href="/admin/tournaments" className="text-gray-400 hover:text-white transition text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Create Tournament</h1>
        </header>
        
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tournament Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Friday Night Magic" className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] focus:ring-1 outline-none transition" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time</label>
                <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none">
                  <option value="COMMANDER">Commander</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SEALED">Sealed</option>
                  <option value="STANDARD">Standard</option>
                  <option value="MODERN">Modern</option>
                  <option value="LEGACY">Legacy</option>
                  <option value="PAUPER">Pauper</option>
                  <option value="VINTAGE">Vintage</option>
                  <option value="PIONEER">Pioneer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Round Timer (Minutes)</label>
                <input required type="number" value={timer} onChange={e => setTimer(Number(e.target.value))} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none tabular-nums" />
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Configuración de Rondas */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Round Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Round Mode</label>
                  <select value={roundMode} onChange={e => setRoundMode(e.target.value as "FIXED" | "ELIMINATION")} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none">
                    <option value="FIXED">Fixed Number of Rounds</option>
                    <option value="ELIMINATION">Until Winner (Single Elimination)</option>
                  </select>
                </div>

                {roundMode === "FIXED" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Total Rounds</label>
                      <input required type="number" min="1" value={totalRounds} onChange={e => setTotalRounds(Number(e.target.value))} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none tabular-nums" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Pairing Mode</label>
                      <select value={pairingMode} onChange={e => setPairingMode(e.target.value)} className="w-full bg-[var(--color-background)] border border-gray-700 rounded-lg p-3 text-white focus:border-[var(--color-indigo-accent)] outline-none">
                        <option value="SWISS">Swiss (similar scores match)</option>
                        <option value="RANDOM">Random</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <hr className="border-gray-800" />
            
            {/* Sección de Premios */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">Prizes</h3>
                <Button type="button" onClick={addPrize} variant="secondary" className="text-xs">Add Prize tier</Button>
              </div>
              <div className="space-y-3">
                {prizes.map((p, i) => (
                  <div key={i} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Prize Name</label>
                      <input required type="text" value={p.name} onChange={e => updatePrize(i, 'name', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-400 mb-1">Store Credit (€)</label>
                      <input type="number" min="0" step="0.5" value={p.storeCreditAmount || 0} onChange={e => updatePrize(i, 'storeCreditAmount', Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-gray-400 mb-1">Start Pos.</label>
                      <input required type="number" min="1" value={p.startPlace} onChange={e => updatePrize(i, 'startPlace', Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-gray-400 mb-1">End Pos.</label>
                      <input required type="number" min="1" value={p.endPlace} onChange={e => updatePrize(i, 'endPlace', Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <Button type="button" onClick={() => removePrize(i)} className="bg-red-900/50 hover:bg-red-900 text-red-200 p-2 rounded">
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {format === 'COMMANDER' && (
              <>
                <hr className="border-gray-800" />
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Commander Points Configuration</h3>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">1st Place</label>
                      <input type="number" value={firstPlace} onChange={e => setFirstPlace(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">2nd Place</label>
                      <input type="number" value={secondPlace} onChange={e => setSecondPlace(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">3rd Place</label>
                      <input type="number" value={thirdPlace} onChange={e => setThirdPlace(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">4th Place</label>
                      <input type="number" value={fourthPlace} onChange={e => setFourthPlace(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Missions</h3>
                    <Button type="button" onClick={addMission} variant="secondary" className="text-xs">Add Mission</Button>
                  </div>
                  <div className="space-y-3">
                    {missions.map((m, i) => (
                      <div key={i} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-400 mb-1">Mission Description</label>
                          <input required type="text" value={m.description} onChange={e => updateMission(i, 'description', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-400 mb-1">Points</label>
                          <input required type="number" value={m.points} onChange={e => updateMission(i, 'points', Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white" />
                        </div>
                        <Button type="button" onClick={() => removeMission(i)} className="bg-red-900/50 hover:bg-red-900 text-red-200 p-2 rounded">
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="pt-4">
              <Button variant="primary" type="submit" className="w-full py-3">Create Event</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
