import { getBuylistRequestDetailAction } from "@/app/actions/buylist-actions";
import { getStoreSettingsAction, getConditionModifiersAction } from "@/app/actions/store-actions";
import { getBuylistPriceBandsAction } from "@/app/actions/buylist-pricing-actions";
import AdminBuylistDetailClient from "./AdminBuylistDetailClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminBuylistDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const [res, store, modsList, bandsRes] = await Promise.all([
    getBuylistRequestDetailAction(resolvedParams.id),
    getStoreSettingsAction(),
    getConditionModifiersAction(),
    getBuylistPriceBandsAction()
  ]);
  
  if (!res.success || !res.data) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-white">Tasación no encontrada</h2>
        <p className="text-slate-400">La tasación que buscas no existe o ha sido eliminada.</p>
        <div className="pt-4">
          <Link href="/admin/buylist">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all">
              Volver al listado
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const defaultRate = store?.buylistDefaultRate ?? 70.0;
  const defaultRateCredit = store?.buylistDefaultRateCredit ?? 75.0;

  const conditionModifiers: Record<string, number> = {};
  if (modsList) {
    modsList.forEach(m => {
      conditionModifiers[m.condition] = m.multiplier;
    });
  }

  const priceBands = bandsRes.success ? (bandsRes.data || []) : [];

  return (
    <AdminBuylistDetailClient 
      initialRequest={res.data} 
      defaultRate={defaultRate} 
      defaultRateCredit={defaultRateCredit} 
      conditionModifiers={conditionModifiers}
      priceBands={priceBands}
    />
  );
}
