import { getArticlesAction } from "@/app/actions/article-actions";
import { PlayerArticlesClient } from "./PlayerArticlesClient";

export const revalidate = 0; // Disable static rendering cache for live articles feed

export default async function ArticlesPage() {
  const res = await getArticlesAction(true); // Fetch active articles only
  const articles = res.success && res.data ? res.data : [];

  return (
    <div className="min-h-screen py-2">
      <PlayerArticlesClient articles={articles} />
    </div>
  );
}
