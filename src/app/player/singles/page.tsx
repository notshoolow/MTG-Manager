import { prisma } from "@/lib/db";
import StockFilters from "@/components/singles/StockFilters";
import StockContainer from "@/components/singles/StockContainer";
import Link from "next/link";
import { Bell } from "lucide-react";
import { populatePrices } from "@/lib/pricing-engine";

export default async function SinglesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string, query?: string, condition?: string, cardId?: string }>
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1");
  const limit = 24;
  const skip = (page - 1) * limit;

  // Se muestran todas las variantes de cartas (incluyendo las agotadas) para posibilitar la subscripción a alertas de stock
  const where: any = {};
  if (resolvedParams.query) {
    where.scryfallCard = {
      name: { contains: resolvedParams.query }
    };
  }
  if (resolvedParams.condition) {
    where.condition = resolvedParams.condition;
  }

  const [stockItems, totalCount] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { scryfallCard: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockItem.count({ where })
  ]);

  let populatedItems = await populatePrices(stockItems);

  if (resolvedParams.cardId) {
    const featuredItem = await prisma.stockItem.findFirst({
      where: { scryfallCardId: resolvedParams.cardId },
      include: { scryfallCard: true }
    });
    if (featuredItem) {
      const populatedFeatured = (await populatePrices([featuredItem]))[0];
      if (!populatedItems.some(item => item.id === populatedFeatured.id)) {
        populatedItems = [populatedFeatured, ...populatedItems];
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Catálogo de Cartas (Singles)</h1>
          <p className="text-gray-400 mt-2">
            Explora y añade cartas sueltas al carrito para tu próximo pedido.
          </p>
        </div>
        <Link
          href="/player/singles/alerts"
          className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          <Bell className="w-4 h-4" />
          Crear alerta de stock
        </Link>
      </div>
      
      <StockFilters totalCount={totalCount} currentPage={page} />
      <StockContainer items={populatedItems} isAdmin={false} initialCardId={resolvedParams.cardId} />
    </div>
  );
}
