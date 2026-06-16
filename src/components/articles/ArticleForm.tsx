"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Eye, Edit3, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ArticleFormProps {
  initialData?: {
    id?: string;
    title: string;
    content: string;
    tags: string[];
    imageUrl?: string | null;
    endDate?: Date | string | null;
  };
  onSubmit: (data: {
    title: string;
    content: string;
    tags: string[];
    imageUrl: string | null;
    endDate: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const AVAILABLE_TAGS = ["noticias", "metajuego", "importante", "otros"];

export function ArticleForm({ initialData, onSubmit, onCancel, isSubmitting = false }: ArticleFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  
  // Lógica de expiración temporal del artículo
  const [hasEndDate, setHasEndDate] = useState(!!initialData?.endDate);
  // Conversión del formato de la fecha de caducidad para el control datetime-local
  const getInitialEndDateString = () => {
    if (!initialData?.endDate) return "";
    const d = new Date(initialData.endDate);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [endDate, setEndDate] = useState(getInitialEndDateString());

  // Alternador entre modo editor y previsualización
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState("");

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!content.trim()) {
      setError("El contenido es obligatorio.");
      return;
    }
    if (selectedTags.length === 0) {
      setError("Selecciona al menos una etiqueta.");
      return;
    }
    if (hasEndDate && !endDate) {
      setError("Por favor, introduce una fecha de finalización si has activado la caducidad.");
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags,
        imageUrl: imageUrl.trim() || null,
        endDate: hasEndDate ? new Date(endDate).toISOString() : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el formulario.";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[var(--color-surface)] border border-gray-800 p-6 md:p-8 rounded-2xl">
      <div className="flex justify-between items-center pb-4 border-b border-gray-850">
        <h2 className="text-xl font-bold text-white">
          {initialData?.id ? "Editar Artículo" : "Crear Nuevo Artículo"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Título */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1.5">
            Título del Artículo *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-indigo-accent)] transition-colors"
            placeholder="Introduce un título descriptivo"
            required
          />
        </div>

        {/* URL de la Imagen */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-1.5">
            URL de la Imagen (Opcional)
          </label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-indigo-accent)] transition-colors"
            placeholder="https://ejemplo.com/imagen.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Si se deja en blanco, se generará una imagen abstracta con colores temáticos de Magic.
          </p>
        </div>

        {/* Selección de Etiquetas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Etiquetas * <span className="text-xs text-gray-500">(Puedes elegir varias)</span>
          </label>
          <div className="flex flex-wrap gap-2.5">
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold uppercase tracking-wider border transition-all ${
                    isSelected
                      ? "bg-[var(--color-indigo-accent)]/20 border-[var(--color-indigo-accent)] text-[var(--color-indigo-accent)]"
                      : "bg-gray-950/50 border-gray-800 text-gray-400 hover:border-gray-700"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha de Finalización (Expiración) */}
        <div className="bg-gray-950/50 border border-gray-850 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Caducidad del Artículo</h4>
              <p className="text-xs text-gray-400">
                Define si el artículo debe dejar de ser visible a partir de cierta fecha.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-450 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-indigo-accent)]"></div>
            </label>
          </div>

          {hasEndDate && (
            <div className="pt-2 animate-fadeIn">
              <label htmlFor="endDate" className="block text-xs font-medium text-gray-400 mb-1.5">
                Desaparecer en la fecha y hora *
              </label>
              <input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[var(--color-indigo-accent)] transition-colors text-sm"
                required={hasEndDate}
              />
            </div>
          )}
        </div>

        {/* Contenido con Vista Previa Markdown */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="content" className="block text-sm font-medium text-gray-300">
              Contenido (Markdown soportado) *
            </label>
            <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  mode === "edit" ? "bg-gray-850 text-white" : "text-gray-450 hover:text-white"
                }`}
              >
                <Edit3 className="w-3 h-3" /> Editar
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  mode === "preview" ? "bg-gray-850 text-white" : "text-gray-450 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" /> Vista Previa
              </button>
            </div>
          </div>

          {mode === "edit" ? (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-indigo-accent)] transition-colors font-mono text-sm leading-relaxed"
              placeholder="Escribe el artículo utilizando formato Markdown (ej. # Encabezado, **negrita**, - listas, etc.)"
              required
            />
          ) : (
            <div className="w-full min-h-[220px] max-h-[400px] overflow-y-auto bg-gray-950/70 border border-gray-850 rounded-xl p-4 prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed space-y-4">
              {content.trim() ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-gray-650 italic">No hay contenido para previsualizar.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-850">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Guardando..."
            : initialData?.id
            ? "Guardar Cambios"
            : "Publicar Artículo"}
        </Button>
      </div>
    </form>
  );
}
