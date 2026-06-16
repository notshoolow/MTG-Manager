"use client";
import { useState } from "react";
import StockViewToggle from "./StockViewToggle";
import StockGrid from "./StockGrid";

export default function StockContainer({ items, isAdmin, initialCardId }: { items: any[], isAdmin: boolean, initialCardId?: string }) {
  const [mode, setMode] = useState<'table'|'grid'>('table');
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <StockViewToggle onToggle={setMode} />
      </div>
      <StockGrid items={items} mode={mode} isAdmin={isAdmin} initialCardId={initialCardId} />
    </div>
  );
}
