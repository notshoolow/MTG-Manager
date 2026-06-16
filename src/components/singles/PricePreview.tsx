"use client";

import { Info } from "lucide-react";
import { useState } from "react";

interface PricePreviewProps {
  originalPrice: number | null;
  finalPrice: number | null;
  condition: string;
  conditionMultiplier?: number;
  pricingRule?: { name: string; type: string; value: number } | null;
  flashSale?: { name: string; discount: number; expiresAt: Date } | null;
  className?: string;
}

export function PricePreview({ 
  originalPrice, 
  finalPrice, 
  condition,
  conditionMultiplier,
  pricingRule,
  flashSale,
  className = "" 
}: PricePreviewProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (finalPrice === null || originalPrice === null) {
    return <span className={`font-bold text-gray-500 ${className}`}>N/A</span>;
  }

  return (
    <div 
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex flex-col items-end">
        {flashSale ? (
          <>
            <span className="text-xs text-gray-500 line-through">€{originalPrice.toFixed(2)}</span>
            <span className="font-bold text-red-400">€{finalPrice.toFixed(2)}</span>
          </>
        ) : (
          <span className="font-bold text-green-400">€{finalPrice.toFixed(2)}</span>
        )}
      </div>

      <div className="text-gray-500 hover:text-white cursor-help ml-1 p-1">
        <Info className="w-3 h-3" />
      </div>

      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-50 text-sm">
          <div className="font-bold text-white border-b border-gray-800 pb-2 mb-2">Desglose de Precio</div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Precio Base:</span>
              <span>€{originalPrice.toFixed(2)}</span>
            </div>

            {conditionMultiplier !== undefined && conditionMultiplier !== 1 && (
              <div className="flex justify-between text-gray-400">
                <span>Estado ({condition}):</span>
                <span>x{conditionMultiplier.toFixed(2)}</span>
              </div>
            )}

            {pricingRule && (
              <div className="flex justify-between text-gray-400">
                <span>Regla ({pricingRule.name}):</span>
                <span>
                  {pricingRule.type === "FLAT_MARKUP" ? `+€${(pricingRule as any).value?.toFixed(2) || (pricingRule as any).valueA?.toFixed(2)}` : `+${(pricingRule as any).value || (pricingRule as any).valueA}%`}
                </span>
              </div>
            )}

            {flashSale && (
              <div className="flex justify-between text-red-400 font-medium">
                <span>Flash Sale ({flashSale.name}):</span>
                <span>-{flashSale.discount * 100}%</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 mt-2 pt-2 flex justify-between font-bold text-white">
            <span>Final:</span>
            <span>€{finalPrice.toFixed(2)}</span>
          </div>
          
          {flashSale && (
              <div className="text-[10px] text-gray-500 mt-2 text-right">
                  Expira: {new Date(flashSale.expiresAt).toLocaleString()}
              </div>
          )}
        </div>
      )}
    </div>
  );
}
