import Link from "next/link";
import { getArticleByIdAction } from "@/app/actions/article-actions";
import { Calendar, ArrowLeft, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const revalidate = 0; // Disable cache so visibility end dates are respected instantly

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  // Retrieve the article (filtering out expired ones for players)
  const res = await getArticleByIdAction(id, true);

  // If the article doesn't exist or is expired, show a premium error page
  if (!res.success || !res.data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-[var(--color-surface)] border border-gray-800 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl">
            📭
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Artículo No Disponible</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              El artículo que estás buscando no existe, ha expirado, o ha sido retirado por los administradores.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/player/articles">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[var(--color-indigo-accent)] text-white hover:bg-indigo-600 transition-colors cursor-pointer text-sm">
                <ArrowLeft className="w-4 h-4" /> Volver a Artículos
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const article = res.data;
  const formattedDate = new Date(article.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

  const getPlaceholderGradient = (str: string) => {
    const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-orange-600 via-amber-800 to-stone-900",
      "from-blue-600 via-indigo-850 to-stone-900",
      "from-emerald-600 via-teal-850 to-stone-900",
      "from-purple-600 via-rose-950 to-stone-900",
    ];
    return gradients[hash % gradients.length];
  };

  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Botón de Atrás */}
      <div>
        <Link href="/player/articles" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Volver a Artículos</span>
        </Link>
      </div>

      {/* Banner de Encabezado Visual */}
      <div className="relative rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-950">
        {article.imageUrl ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent z-10"></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full aspect-[21/9] object-cover object-center max-h-[350px]"
            />
          </>
        ) : (
          <div className={`w-full aspect-[21/9] max-h-[350px] bg-gradient-to-br ${getPlaceholderGradient(article.id)} flex items-center justify-center`}>
            <div className="text-white/10 text-7xl font-extrabold tracking-widest select-none font-sans">MTG MANAGER</div>
          </div>
        )}
      </div>

      {/* Metadatos y Título */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Etiquetas */}
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className={`text-[11px] font-bold px-3 py-0.5 rounded-md uppercase tracking-wider ${getTagStyles(
                  tag
                )}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="text-gray-600">•</span>
          {/* Fecha */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-light">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{formattedDate}</span>
          </div>
          
          {article.endDate && (
            <>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1.5 text-xs text-amber-400/80 font-medium">
                <Clock className="w-4 h-4 text-amber-500/80" />
                <span>Expira: {new Date(article.endDate).toLocaleDateString("es-ES")}</span>
              </div>
            </>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          {article.title}
        </h1>
      </div>

      {/* Contenido del Artículo */}
      <div className="p-8 md:p-10 bg-[var(--color-surface)] border border-gray-800/80 rounded-3xl shadow-xl">
        <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-6">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-extrabold text-white mt-8 mb-4 border-b border-gray-800 pb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-6 mb-4">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-bold text-white mt-4 mb-2">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-gray-300 font-light text-base md:text-lg leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5 text-gray-300 font-light">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-gray-300 font-light">{children}</ol>,
              li: ({ children }) => <li className="text-gray-350">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-[var(--color-indigo-accent)] bg-gray-950/40 p-4 italic rounded-r-lg my-4 text-gray-400">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => <code className="bg-gray-950 px-1.5 py-0.5 rounded text-red-400 font-mono text-sm">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-950 p-4 rounded-xl overflow-x-auto border border-gray-850 font-mono text-sm my-4 text-gray-300">{children}</pre>,
              a: ({ href, children }) => <a href={href} className="text-[var(--color-indigo-accent)] hover:text-indigo-400 underline font-medium transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </div>
    </article>
  );
}
