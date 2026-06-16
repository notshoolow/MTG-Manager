"use client";

import { useState } from "react";
import { ArticleCard, ArticleData } from "@/components/articles/ArticleCard";
import { Search, Filter } from "lucide-react";

interface PlayerArticlesClientProps {
  articles: ArticleData[];
}

const AVAILABLE_TAGS = ["todos", "noticias", "metajuego", "importante", "otros"];

export function PlayerArticlesClient({ articles }: PlayerArticlesClientProps) {
  const [selectedTag, setSelectedTag] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtra la lista de artículos según la etiqueta seleccionada y la consulta de búsqueda
  const filteredArticles = articles.filter((article) => {
    // 1. Filtro de etiqueta
    const matchesTag =
      selectedTag === "todos" ||
      article.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

    // 2. Filtro de consulta de búsqueda
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTag && matchesSearch;
  });

  const getTagBadgeStyles = (tag: string, isActive: boolean) => {
    if (!isActive) {
      return "bg-gray-950/40 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white";
    }

    switch (tag.toLowerCase()) {
      case "todos":
        return "bg-[var(--color-indigo-accent)]/20 border-[var(--color-indigo-accent)] text-[var(--color-indigo-accent)]";
      case "importante":
        return "bg-red-500/20 border-red-500 text-red-450";
      case "noticias":
        return "bg-blue-500/20 border-blue-500 text-blue-450";
      case "metajuego":
        return "bg-purple-500/20 border-purple-500 text-purple-450";
      case "otros":
      default:
        return "bg-gray-500/20 border-gray-500 text-gray-350";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Panel de Título */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
          Artículos y Noticias
        </h1>
        <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed max-w-2xl">
          Mantente al día con los últimos análisis de metajuego, spoilers de cartas, guías de torneos y avisos oficiales de la comunidad.
        </p>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-[var(--color-surface)]/45 backdrop-blur-md border border-gray-800 rounded-2xl shadow-lg">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar artículos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950/70 border border-gray-850 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-indigo-accent)] transition-colors"
          />
        </div>

        {/* Filtros de etiquetas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-gray-500 shrink-0 ml-1 hidden md:block" />
          <div className="flex gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer shrink-0 ${getTagBadgeStyles(
                    tag,
                    isActive
                  )}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Feed */}
      {filteredArticles.length === 0 ? (
        <div className="p-16 border border-dashed border-gray-850 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-[var(--color-surface)]/10 shadow-inner">
          <div className="text-gray-600 text-5xl">🔍</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">No se encontraron artículos</h3>
            <p className="text-gray-400 text-sm max-w-sm font-light">
              No hay artículos que coincidan con la etiqueta seleccionada o tu búsqueda. Intenta cambiar de filtro o ampliar tu consulta.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
