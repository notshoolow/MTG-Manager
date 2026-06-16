"use client";
 
import { useState } from "react";
import { adminResolveMatchAction } from "@/app/actions/tournament-actions";
import { Button } from "@/components/ui/Button";
 
interface AdminMatchControlsProps {
  matchId: string;
  matchPlayers: any[];
  isCommander?: boolean;
  missions?: any[];
}
 
export default function AdminMatchControls({ matchId, matchPlayers, isCommander, missions }: AdminMatchControlsProps) {
  const [points, setPoints] = useState<Record<string, number>>({});
  const [selectedMissions, setSelectedMissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
 
  if (!isOpen) {
    return (
      <Button variant="danger" className="text-xs py-1 h-auto" onClick={() => setIsOpen(true)}>
        Admin Resolve
      </Button>
    );
  }
 
  return (
    <div className="mt-4 p-3 bg-red-950/40 border border-red-900 rounded-lg">
      <h4 className="text-xs font-semibold text-red-400 mb-2">Override Results</h4>
      <div className="space-y-3 mb-3">
         {matchPlayers.map(mp => {
           const playerSelectedMissions = selectedMissions[mp.id] || {};
           const currentCustomMissionsScore = Object.entries(playerSelectedMissions)
             .filter(([_, checked]) => checked)
             .reduce((sum, [missionId]) => {
               const mission = missions?.find(m => m.id === missionId);
               return sum + (mission?.points || 0);
             }, 0);

           return (
             <div key={mp.id} className="space-y-2 border-b border-red-900/30 pb-3 last:border-0 last:pb-0">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-gray-300 font-medium">{mp.registration?.user?.name}</span>
                 <div className="flex items-center gap-2">
                   {isCommander && (
                      <span className="text-[10px] text-gray-500 font-mono">
                        Base Pts:
                      </span>
                   )}
                   <input 
                     type="number" 
                     className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white"
                     value={points[mp.id] ?? ""}
                     onChange={e => setPoints({...points, [mp.id]: parseInt(e.target.value) || 0})}
                     placeholder="Pts"
                   />
                 </div>
               </div>
               {isCommander && missions && missions.length > 0 && (
                  <div className="pl-3 space-y-1">
                     <p className="text-[9px] uppercase font-bold text-red-400/70 tracking-wider">Missions</p>
                     {missions.map(m => (
                        <label key={m.id} className="flex items-start gap-1.5 text-[11px] text-gray-400 hover:text-white cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            className="mt-0.5 rounded border-gray-700 bg-gray-900 text-red-600 focus:ring-red-500"
                            checked={!!playerSelectedMissions[m.id]}
                            onChange={e => {
                              const isChecked = e.target.checked;
                              setSelectedMissions({
                                ...selectedMissions,
                                [mp.id]: {
                                  ...playerSelectedMissions,
                                  [m.id]: isChecked
                                }
                              });
                            }}
                          />
                          <span>{m.description} <span className="text-[9px] text-indigo-400 font-bold">+{m.points}</span></span>
                        </label>
                     ))}
                     <div className="text-[9px] text-indigo-400 font-mono">
                        Mission points: +{currentCustomMissionsScore} (Total: {(points[mp.id] || 0) + currentCustomMissionsScore} pts)
                     </div>
                  </div>
               )}
             </div>
           );
         })}
      </div>
      <div className="flex gap-2">
        <Button 
          variant="danger" 
          className="flex-1 text-xs py-1 h-auto"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const data = matchPlayers.map(mp => {
              const playerSelectedMissions = selectedMissions[mp.id] || {};
              const customMissionsScore = Object.entries(playerSelectedMissions)
                .filter(([_, checked]) => checked)
                .reduce((sum, [missionId]) => {
                  const mission = missions?.find(m => m.id === missionId);
                  return sum + (mission?.points || 0);
                }, 0);
              return {
                matchPlayerId: mp.id,
                points: points[mp.id] || 0,
                customMissions: customMissionsScore
              };
            });
            await adminResolveMatchAction(matchId, data);
            setIsOpen(false);
            setLoading(false);
          }}
        >
          Submit Override
        </Button>
        <Button variant="secondary" className="text-xs py-1 h-auto" onClick={() => setIsOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
