"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function StockFilters({ totalCount, currentPage }: { totalCount: number, currentPage: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [condition, setCondition] = useState(searchParams.get("condition") || "");

  const handleApply = () => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (condition) params.set("condition", condition);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / 24) || 1;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-800">
      <form 
        className="flex flex-1 gap-4 items-center w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleApply();
        }}
      >
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por nombre..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <select 
          value={condition} 
          onChange={(e) => setCondition(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">Todas las condiciones</option>
          <option value="M">Mint (M)</option>
          <option value="NM">Near Mint (NM)</option>
          <option value="EX">Excellent (EX)</option>
          <option value="GD">Good (GD)</option>
          <option value="LP">Lightly Played (LP)</option>
          <option value="PL">Played (PL)</option>
          <option value="PO">Poor (PO)</option>
        </select>
        <Button variant="primary" type="submit">Filtrar</Button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">{totalCount} items</span>
        <Button 
          variant="secondary" 
          size="sm" 
          disabled={currentPage <= 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          Anterior
        </Button>
        <span className="text-white text-sm">{currentPage} / {totalPages}</span>
        <Button 
          variant="secondary" 
          size="sm" 
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
