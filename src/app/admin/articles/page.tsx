import { getArticlesAction } from "@/app/actions/article-actions";
import { AdminArticlesClient } from "./AdminArticlesClient";

export const revalidate = 0; // Desactivar la caché de renderizado estático para actualizaciones en vivo de administración

export default async function AdminArticlesPage() {
  const res = await getArticlesAction(false); // Obtener todos los artículos, incluidos los caducados
  const articles = res.success && res.data ? res.data : [];

  return (
    <div className="max-w-6xl mx-auto py-2">
      <AdminArticlesClient initialArticles={articles} />
    </div>
  );
}
