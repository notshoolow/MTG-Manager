"use client";

import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";

export interface ArticleData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  tags: string[];
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ArticleCardProps {
  article: ArticleData;
  isAdmin?: boolean;
}

export function ArticleCard({ article, isAdmin = false }: ArticleCardProps) {
  const { id, title, content, imageUrl, tags, endDate, createdAt } = article;

  // Conversión del formato de fecha
  const formattedDate = new Date(createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isExpired = endDate ? new Date(endDate) <= new Date() : false;

  // Función auxiliar para definir los estilos de las etiquetas
  const getTagStyles = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "importante":
        return "bg-red-500/15 text-red-400 border border-red-500/30";
      case "noticias":
        return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
      case "metajuego":
        return "bg-purple-500/15 text-purple-400 border border-purple-500/30";
      case "otros":
      default:
        return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
    }
  };

  // Generación de un degradado abstracto con temática de MTG basado en el identificador si no se provee imagen
  const getPlaceholderGradient = (str: string) => {
    const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-orange-600 to-amber-900", // Estilo de colores Rojo/Oro (MTG)
      "from-blue-600 to-indigo-900",  // Estilo de colores Azul/Control (MTG)
      "from-emerald-600 to-teal-900", // Estilo de colores Verde/Stompy (MTG)
      "from-purple-600 to-rose-950",  // Estilo de colores Rakdos/Negro (MTG)
    ];
    return gradients[hash % gradients.length];
  };

  const targetLink = isAdmin ? `/admin/articles` : `/player/articles/${id}`;

  return (
    <div className="group relative bg-[var(--color-surface)] border border-gray-800 hover:border-gray-700 rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-0.5">
      {/* Imagen de Artículo / Degradado */}
      <div className="w-full md:w-1/3 relative aspect-video md:aspect-auto min-h-[160px] overflow-hidden bg-gray-950">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient(id)} flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity duration-300`}>
            <div className="text-white/20 text-5xl font-extrabold select-none">MTG</div>
          </div>
        )}
        
        {/* Insignias de Administración */}
        {isAdmin && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isExpired ? (
              <span className="text-xs bg-red-950/80 text-red-300 border border-red-800/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm font-semibold">
                Expirado
              </span>
            ) : endDate ? (
              <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm font-semibold">
                Temporal
              </span>
            ) : (
              <span className="text-xs bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm font-semibold">
                Permanente
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contenido de Artículo */}
      <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
        <div>
          {/* Etiquetas */}
          <div className="flex flex-wrap gap-2 mb-3.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${getTagStyles(
                  tag
                )}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Título */}
          <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-[var(--color-indigo-accent)] transition-colors line-clamp-2">
            {isAdmin ? title : <Link href={targetLink}>{title}</Link>}
          </h3>

          {/* Vista Previa del Contenido */}
          <p className="text-gray-400 text-sm md:text-base line-clamp-3 mb-6 font-light leading-relaxed">
            {content.replace(/[#*`[\]]/g, "")} {/* Eliminación de caracteres markdown simples para la vista previa */}
          </p>
        </div>

        {/* Pie de Tarjeta */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span>{formattedDate}</span>
          </div>

          {endDate && (
            <div className="flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Expira: {new Date(endDate).toLocaleDateString("es-ES")}</span>
            </div>
          )}

          {!isAdmin && (
            <Link
              href={targetLink}
              className="flex items-center gap-1 text-sm font-semibold text-[var(--color-indigo-accent)] hover:text-indigo-400 group-hover:gap-2 transition-all"
            >
              Leer más <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
