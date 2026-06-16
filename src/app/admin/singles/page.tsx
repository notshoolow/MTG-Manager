import { prisma } from "@/lib/db";
import InventoryManager from "./InventoryManager";
import StockFilters from "@/components/singles/StockFilters";
import StockContainer from "@/components/singles/StockContainer";
import { populatePrices } from "@/lib/pricing-engine";

export default async function AdminSinglesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string, query?: string, condition?: string }>
}) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1");
  const limit = 24;
  const skip = (page - 1) * limit;

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

  const populatedItems = await populatePrices(stockItems);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventario de Singles</h1>
          <p className="text-gray-400">Gestiona tu stock y añade nuevas cartas al catálogo.</p>
        </div>
      </div>
      
      <InventoryManager />

      <div className="space-y-4 pt-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Stock Actual</h2>
        </div>
        
        <StockFilters totalCount={totalCount} currentPage={page} />
        <StockContainer items={populatedItems} isAdmin={true} />
      </div>
    </div>
  );
}
