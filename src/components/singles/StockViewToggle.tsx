"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export default function StockViewToggle({ onToggle }: { onToggle: (view: 'table' | 'grid') => void }) {
  const [view, setView] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    const saved = localStorage.getItem('mtg-stock-view');
    if (saved === 'grid' || saved === 'table') {
      setView(saved);
      onToggle(saved);
    }
  }, [onToggle]);

  const handleToggle = (v: 'table' | 'grid') => {
    setView(v);
    localStorage.setItem('mtg-stock-view', v);
    onToggle(v);
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant={view === 'table' ? 'primary' : 'secondary'} 
        size="sm"
        onClick={() => handleToggle('table')}
      >
        Tabla
      </Button>
      <Button 
        variant={view === 'grid' ? 'primary' : 'secondary'} 
        size="sm"
        onClick={() => handleToggle('grid')}
      >
        Tarjetas
      </Button>
    </div>
  );
}
