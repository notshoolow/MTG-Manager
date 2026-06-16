"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { parseBulkImportText, BULK_IMPORT_MAX_LINES } from "@/lib/bulk-import-parser";
import type { ParsedImportLine } from "@/lib/bulk-import-parser";
import { bulkImportAction } from "@/app/actions/inventory-actions";
import type { BulkImportResult } from "@/app/actions/inventory-actions";
import { Upload, ClipboardList, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";

type Step = "input" | "preview" | "result";
type InputTab = "text" | "file";

const CONDITION_LABELS: Record<string, string> = { 
  M: "Mint", 
  NM: "Near Mint", 
  EX: "Excellent", 
  GD: "Good", 
  LP: "Lightly Played", 
  PL: "Played", 
  PO: "Poor" 
};
const FINISH_LABELS: Record<string, string> = { nonfoil: "Non-foil", foil: "Foil", etched: "Etched" };
const LANGUAGE_LABELS: Record<string, string> = { en: "EN", es: "ES", ja: "JA" };

export default function BulkImportManager() {
  const [step, setStep] = useState<Step>("input");
  const [inputTab, setInputTab] = useState<InputTab>("text");
  const [rawText, setRawText] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedImportLine[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Paso 1: análisis sintáctico (parse) ──────────────────────────
  const handleAnalyze = () => {
    const text = rawText.trim();
    if (!text) return;
    const { lines, skipped: s } = parseBulkImportText(text);
    setParsedLines(lines);
    setSkipped(s);
    setStep("preview");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  // ── Edición en línea de filas analizadas ──────────────────────────
  const updateLine = <K extends keyof ParsedImportLine>(idx: number, key: K, value: ParsedImportLine[K]) => {
    setParsedLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l));
  };

  // ── Paso 2 → 3: importación ────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    // Se invoca la acción del servidor con el listado completo.
    // La acción se ejecuta de forma secuencial con un retardo de 100 ms por carta.
    // Se realiza una estimación del progreso mediante un temporizador como aproximación.
    const total = parsedLines.length;
    const estimatedMs = total * 150;
    const tickInterval = Math.max(500, estimatedMs / 20);
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + (100 / 20), 95));
    }, tickInterval);

    const res = await bulkImportAction(parsedLines);
    clearInterval(timer);
    setProgress(100);
    setResult(res);
    setImporting(false);
    setStep("result");
  };

  // ── Descarga de líneas fallidas ──────────────────────────────────
  const downloadFailed = () => {
    if (!result?.failed.length) return;
    const content = result.failed.map(f => `${f.raw}  // ${f.reason}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-import-failed.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep("input");
    setRawText("");
    setParsedLines([]);
    setSkipped(0);
    setResult(null);
    setProgress(0);
  };

  // ─────────────────────────────────────────────────────────────
  // Renderizado
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── PASO 1: Entrada ── */}
      {step === "input" && (
        <div className="space-y-4">
          {/* Pestañas */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit">
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${inputTab === "text" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setInputTab("text")}
            >
              <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Pegar texto</span>
            </button>
            <button
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${inputTab === "file" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setInputTab("file")}
            >
              <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Subir archivo</span>
            </button>
          </div>

          {inputTab === "text" ? (
            <textarea
              className="w-full h-56 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 resize-y"
              placeholder={`Formato: <cantidad> <nombre> [SET] [condición] [finish] [idioma] [precio]\n\nEjemplos:\n4 Lightning Bolt\n2 Black Lotus [LEA] NM foil en 5.50\n1 Counterspell [ICE] SP nonfoil es\n3 Ragavan, Nimble Pilferer [MH2]`}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
            />
          ) : (
            <div
              className="border-2 border-dashed border-gray-700 rounded-lg p-10 text-center cursor-pointer hover:border-indigo-500 transition-colors"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Arrastra un archivo <code>.txt</code> aquí o haz clic para seleccionarlo</p>
              {rawText && <p className="text-green-400 text-xs mt-2">✓ Archivo cargado — {rawText.split("\n").length} líneas</p>}
              <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Máximo {BULK_IMPORT_MAX_LINES} cartas por importación.</p>
            <Button variant="primary" onClick={handleAnalyze} disabled={!rawText.trim()}>
              Analizar lista →
            </Button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Previsualización ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{parsedLines.length} cartas listas para importar</h3>
              {skipped > 0 && (
                <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> {skipped} {skipped === 1 ? "línea ignorada" : "líneas ignoradas"} (sin cantidad o formato inválido)
                </p>
              )}
              {parsedLines.length > BULK_IMPORT_MAX_LINES && (
                <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> Lista recortada al máximo de {BULK_IMPORT_MAX_LINES} entradas.
                </p>
              )}
            </div>
            <button onClick={() => setStep("input")} className="text-gray-400 hover:text-white text-sm underline">
              ← Volver
            </button>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-800 text-gray-400 sticky top-0">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Set</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Condición</th>
                  <th className="px-3 py-2">Finish</th>
                  <th className="px-3 py-2">Idioma</th>
                  <th className="px-3 py-2">Precio (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {parsedLines.slice(0, BULK_IMPORT_MAX_LINES).map((line, i) => (
                  <tr key={i} className="text-gray-300 hover:bg-gray-800/50">
                    <td className="px-3 py-2 font-medium text-white max-w-[180px] truncate">{line.name}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white uppercase text-xs"
                        value={line.setCode ?? ""}
                        onChange={e => updateLine(i, "setCode", e.target.value.toUpperCase() || undefined)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="1"
                        className="w-12 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white text-xs"
                        value={line.quantity}
                        onChange={e => updateLine(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white text-xs"
                        value={line.condition}
                        onChange={e => updateLine(i, "condition", e.target.value as any)}
                      >
                        {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white text-xs"
                        value={line.finish}
                        onChange={e => updateLine(i, "finish", e.target.value as any)}
                      >
                        {Object.entries(FINISH_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white text-xs"
                        value={line.language}
                        onChange={e => updateLine(i, "language", e.target.value as any)}
                      >
                        {Object.entries(LANGUAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" step="0.01" min="0"
                        placeholder="Mercado"
                        className="w-20 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-white text-xs"
                        value={line.price ?? ""}
                        onChange={e => updateLine(i, "price", e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={reset}>Cancelar</Button>
            <Button
              variant="primary"
              className="min-w-[200px]"
              onClick={handleImport}
              disabled={importing || parsedLines.length === 0}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando... {Math.round(progress)}%
                </span>
              ) : (
                `Importar ${Math.min(parsedLines.length, BULK_IMPORT_MAX_LINES)} cartas`
              )}
            </Button>
          </div>

          {importing && (
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── PASO 3: Resultado ── */}
      {step === "result" && result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-green-900/20 border border-green-800/50 rounded-lg flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-3xl font-black text-green-400">{result.imported.length}</p>
                <p className="text-green-300 text-sm">Importadas correctamente</p>
              </div>
            </div>
            <div className={`p-5 rounded-lg flex items-center gap-4 border ${result.failed.length > 0 ? "bg-red-900/20 border-red-800/50" : "bg-gray-800 border-gray-700"}`}>
              <XCircle className={`w-10 h-10 flex-shrink-0 ${result.failed.length > 0 ? "text-red-400" : "text-gray-600"}`} />
              <div>
                <p className={`text-3xl font-black ${result.failed.length > 0 ? "text-red-400" : "text-gray-500"}`}>{result.failed.length}</p>
                <p className={`text-sm ${result.failed.length > 0 ? "text-red-300" : "text-gray-500"}`}>Fallidas</p>
              </div>
            </div>
          </div>

          {result.imported.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium text-sm">Cartas importadas con éxito</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800 bg-gray-950">
                {result.imported.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium">
                      {item.name} {item.setCode && <span className="text-gray-500 font-bold ml-1">[{item.setCode}]</span>}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.source === "LOCAL" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {item.source === "LOCAL" ? "Base de Datos Local" : "Scryfall API"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.failed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-amber-400 font-medium text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Líneas fallidas
                </h4>
                <button
                  onClick={downloadFailed}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar .txt
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800">
                {result.failed.map((f, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between gap-4 text-xs">
                    <span className="text-gray-300 font-mono truncate">{f.raw}</span>
                    <span className="text-red-400 flex-shrink-0">{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="primary" onClick={reset}>Nueva importación</Button>
          </div>
        </div>
      )}
    </div>
  );
}
