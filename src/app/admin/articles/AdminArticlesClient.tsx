"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArticleData } from "@/components/articles/ArticleCard";
import { ArticleForm } from "@/components/articles/ArticleForm";
import {
  createArticleAction,
  updateArticleAction,
  deleteArticleAction,
} from "@/app/actions/article-actions";
import { Plus, Edit2, Trash2, Calendar, AlertTriangle } from "lucide-react";

interface AdminArticlesClientProps {
  initialArticles: ArticleData[];
}

export function AdminArticlesClient({ initialArticles }: AdminArticlesClientProps) {
  const [articles, setArticles] = useState<ArticleData[]>(initialArticles);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Gestión del envío del formulario de creación/modificación
  const handleFormSubmit = async (formData: {
    title: string;
    content: string;
    tags: string[];
    imageUrl: string | null;
    endDate: string | null;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingArticle) {
        // Acción de edición
        const res = await updateArticleAction(editingArticle.id, formData);
        if (res.success && res.data) {
          const updated: ArticleData = {
            ...res.data,
            tags: res.data.tags ? res.data.tags.split(",") : [],
          };
          setArticles((prev) =>
            prev.map((a) => (a.id === editingArticle.id ? updated : a))
          );
          setIsFormOpen(false);
          setEditingArticle(null);
        } else {
          throw new Error(res.error || "Error al actualizar el artículo");
        }
      } else {
        // Acción de creación
        const res = await createArticleAction(formData);
        if (res.success && res.data) {
          const created: ArticleData = {
            ...res.data,
            tags: res.data.tags ? res.data.tags.split(",") : [],
          };
          setArticles((prev) => [created, ...prev]);
          setIsFormOpen(false);
        } else {
          throw new Error(res.error || "Error al crear el artículo");
        }
      }
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestión del borrado
  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await deleteArticleAction(id);
      if (res.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setConfirmDeleteId(null);
      } else {
        alert(res.error || "No se pudo eliminar el artículo.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al intentar eliminar el artículo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (endDate: Date | string | null | undefined) => {
    if (!endDate) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-450"></span>
          Permanente
        </span>
      );
    }
    const isExpired = new Date(endDate) <= new Date();
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          Expirado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        Activo (Expira)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Panel de cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-surface)] border border-gray-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Gestor de Artículos</h1>
          <p className="text-gray-400 text-sm">
            Crea, edita y gestiona las noticias, análisis de metajuego y avisos de la comunidad.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingArticle(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Artículo
        </Button>
      </div>

      {/* Capa superpuesta del diálogo del formulario */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <ArticleForm
              initialData={editingArticle || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingArticle(null);
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación de borrado */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--color-surface)] border border-gray-800 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">¿Eliminar artículo?</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Esta acción no se puede deshacer. El artículo se eliminará permanentemente de la base de datos y no será visible para los jugadores.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDeleteId(null)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Listado / Cuadrícula de artículos */}
      {articles.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-[var(--color-surface)]/20 shadow-inner">
          <div className="text-gray-500 text-5xl">✍️</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">No hay artículos creados</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Crea tu primer artículo de noticias o metajuego haciendo clic en el botón &quot;Nuevo Artículo&quot;.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingArticle(null);
              setIsFormOpen(true);
            }}
            className="mt-2"
          >
            Crear Artículo
          </Button>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/40 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Artículo</th>
                  <th className="px-6 py-4">Etiquetas</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Publicado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {articles.map((art) => {
                  const formattedDate = new Date(art.createdAt).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <tr key={art.id} className="hover:bg-gray-800/10 transition-colors group">
                      {/* Título y Previsualización */}
                      <td className="px-6 py-5 max-w-sm md:max-w-md">
                        <div className="flex items-center gap-3">
                          {art.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={art.imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-gray-900 border border-gray-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm select-none">
                              MTG
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white group-hover:text-[var(--color-indigo-accent)] transition-colors line-clamp-1">
                              {art.title}
                            </div>
                            <div className="text-gray-400 text-xs line-clamp-1 font-light mt-0.5">
                              {art.content.replace(/[#*`[\]]/g, "")}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Etiquetas */}
                      <td className="px-6 py-5 whitespace-nowrap font-light text-slate-400">
                        <div className="flex flex-wrap gap-1.5">
                          {art.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        {getStatusBadge(art.endDate)}
                      </td>

                      {/* Fecha de creación */}
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400 font-light">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          {formattedDate}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingArticle(art);
                              setIsFormOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-white bg-gray-950/40 border border-gray-800 hover:border-gray-700 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(art.id)}
                            className="p-2 text-gray-400 hover:text-red-400 bg-gray-950/40 border border-gray-800 hover:border-red-950/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
