import { getStoreSettingsAction, getConditionModifiersAction } from "@/app/actions/store-actions";
import { getBuylistPriceBandsAction } from "@/app/actions/buylist-pricing-actions";
import NewBuylistClient from "./NewBuylistClient";

export default async function NewBuylistPage() {
  const [store, modsList, bandsRes] = await Promise.all([
    getStoreSettingsAction(),
    getConditionModifiersAction(),
    getBuylistPriceBandsAction()
  ]);
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
    <NewBuylistClient 
      defaultRate={defaultRate} 
      defaultRateCredit={defaultRateCredit} 
      initialConditionModifiers={conditionModifiers} 
      initialPriceBands={priceBands}
    />
  );
}
