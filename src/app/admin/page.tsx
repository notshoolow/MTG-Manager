import { getDashboardMetrics } from "@/lib/actions/dashboard";
import DashboardClient from "@/components/admin/dashboard/DashboardClient";

export const metadata = {
  title: "Admin Dashboard - MTG Manager",
  description: "Business Intelligence Dashboard",
};

export default async function AdminDashboardPage() {
  // Obtención de los datos iniciales en el servidor para el intervalo por defecto de 30 días
  const initialData = await getDashboardMetrics("30d");

  return (
    <div className="w-full">
      <DashboardClient initialData={initialData} />
    </div>
  );
}
