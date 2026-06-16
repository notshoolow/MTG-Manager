"use client";

import { useEffect, useState } from "react";

export default function RoundTimer({ roundStartedAt, roundTimer }: { roundStartedAt: string; roundTimer: number }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const endTime = new Date(roundStartedAt).getTime() + roundTimer * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [roundStartedAt, roundTimer]);

  return (
    <div className={`text-center px-4 py-2 rounded-lg border font-mono text-2xl font-bold tabular-nums ${
      expired
        ? "bg-red-950/60 border-red-800 text-red-400 animate-pulse"
        : "bg-gray-900 border-gray-700 text-white"
    }`}>
      ⏱ {timeLeft}
    </div>
  );
}
