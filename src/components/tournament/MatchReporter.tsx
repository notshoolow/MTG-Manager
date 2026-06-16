"use client";
 
import { useState } from "react";
import { submitMatchResultAction, confirmMatchResultAction, denyMatchResultAction } from "@/app/actions/tournament-actions";
import { Button } from "@/components/ui/Button";
 
interface MatchReporterProps {
  matchId: string;
  myRegistrationId: string;
  matchPlayers: any[];
  matchStatus: string;
  myStatus: string;
  isCommander?: boolean;
  missions?: any[];
}
 
export default function MatchReporter({ matchId, myRegistrationId, matchPlayers, matchStatus, myStatus, isCommander, missions }: MatchReporterProps) {
  const [points, setPoints] = useState<Record<string, number>>({});
  const [selectedMissions, setSelectedMissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(false);
 
  if (matchStatus === "PENDING_CONFIRMATION") {
     if (myStatus === "CONFIRMED") {
         return <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-800 rounded text-sm text-yellow-500">Waiting for opponents to confirm...</div>;
     }
     return (
       <div className="mt-4 space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
         <p className="text-sm text-gray-300 font-medium tracking-wide">An opponent proposed these results. Please verify.</p>
         <div className="space-y-1 bg-gray-900 p-3 rounded">
           {matchPlayers.map(mp => (
             <div key={mp.id} className="text-xs text-gray-400 flex justify-between">
               <span>{mp.registration.user.name}</span>
               <span className="font-bold text-white">{(mp.points + mp.customMissions)} pts</span>
             </div>
           ))}
         </div>
         <div className="flex gap-2 mt-4">
           <Button variant="primary" className="flex-1" disabled={loading} onClick={async () => {
             setLoading(true);
             try { await confirmMatchResultAction(matchId, myRegistrationId); }
             finally { setLoading(false); }
           }}>Confirm</Button>
           <Button variant="danger" className="flex-1 bg-red-900 hover:bg-red-800 text-red-100" disabled={loading} onClick={async () => {
             setLoading(true);
             try { await denyMatchResultAction(matchId); }
             finally { setLoading(false); }
           }}>Deny</Button>
         </div>
       </div>
     );
  }
 
  if (matchStatus === "DISPUTED") {
      return <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-400 text-center">Results disputed. Please contact the admin.</div>;
  }
 
  if (matchStatus === "COMPLETED") {
      return <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded text-sm text-green-400 text-center font-medium">Match Completed</div>;
  }
 
  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <h4 className="text-sm font-semibold text-[var(--color-indigo-accent)] mb-4 uppercase tracking-widest text-center">Report Results</h4>
      <div className="space-y-4">
         {matchPlayers.map(mp => {
           const playerSelectedMissions = selectedMissions[mp.id] || {};
           const currentCustomMissionsScore = Object.entries(playerSelectedMissions)
             .filter(([_, checked]) => checked)
             .reduce((sum, [missionId]) => {
               const mission = missions?.find(m => m.id === missionId);
               return sum + (mission?.points || 0);
             }, 0);

           return (
             <div key={mp.id} className="space-y-2 border-b border-gray-700/50 pb-4 last:border-0 last:pb-0">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-gray-300 font-medium">{mp.registration.user.name}</span>
                 <div className="flex items-center gap-2">
                   {isCommander && (
                      <span className="text-xs text-gray-500 font-mono">
                        Base Pts:
                      </span>
                   )}
                   <input 
                     type="number" 
                     className="w-20 px-3 py-1.5 bg-gray-900 border border-gray-600 focus:border-[var(--color-indigo-accent)] rounded text-white text-sm outline-none transition"
                     value={points[mp.id] ?? ""}
                     onChange={e => setPoints({...points, [mp.id]: parseInt(e.target.value) || 0})}
                     placeholder="Pts"
                   />
                 </div>
               </div>
               {isCommander && missions && missions.length > 0 && (
                  <div className="pl-4 space-y-1 mt-2">
                     <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Missions</p>
                     {missions.map(m => (
                        <label key={m.id} className="flex items-start gap-2 text-xs text-gray-400 hover:text-white cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            className="mt-0.5 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
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
                          <span>{m.description} <span className="text-[10px] text-indigo-400 font-bold">+{m.points} pts</span></span>
                        </label>
                     ))}
                     <div className="text-[10px] text-indigo-400 font-mono mt-1">
                        Mission points: +{currentCustomMissionsScore} pts (Total: {(points[mp.id] || 0) + currentCustomMissionsScore} pts)
                     </div>
                  </div>
               )}
             </div>
           );
         })}
      </div>
      <Button 
        variant="primary" 
        className="mt-6 w-full shadow-[0_0_15px_rgba(99,102,241,0.2)]"
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
          await submitMatchResultAction(matchId, myRegistrationId, data);
        }}
      >
        Submit Results
      </Button>
    </div>
  );
}
