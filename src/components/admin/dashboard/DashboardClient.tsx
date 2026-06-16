"use client";

import { useState, useTransition } from "react";
import { getDashboardMetrics, DateRangeFilter } from "@/lib/actions/dashboard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line 
} from "recharts";
import { 
  Download, Calendar, TrendingUp, DollarSign, Package, Users, Coins 
} from "lucide-react";

type DashboardData = Awaited<ReturnType<typeof getDashboardMetrics>>;

interface DashboardClientProps {
  initialData: DashboardData;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (newRange: DateRangeFilter) => {
    setDateRange(newRange);
    startTransition(async () => {
      const newData = await getDashboardMetrics(newRange);
      setData(newData);
    });
  };

  const handleCustomDateApply = () => {
    if (!customStart || !customEnd) return;
    setDateRange("custom");
    startTransition(async () => {
      const newData = await getDashboardMetrics("custom", customStart, customEnd);
      setData(newData);
    });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Revenue", data.sales.totalRevenue.toFixed(2)],
      ["AOV", data.sales.aov.toFixed(2)],
      ["Pending Orders", data.sales.pendingOrdersCount],
      ["Inventory Value", data.inventory.totalValue.toFixed(2)],
      ["Avg Tournament Attendance", data.tournaments.avgAttendance.toFixed(1)],
      ["Upcoming Tournaments", data.tournaments.upcomingCount],
      ["Pending Buylist Value", data.buylist.pendingValue.toFixed(2)],
      ["Approved Buylist Volume", data.buylist.approvedVolume.toFixed(2)],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dashboard_export_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabecera y Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Resumen de Negocio
          </h2>
          <p className="text-sm text-gray-400 mt-1">Métricas clave para la toma de decisiones</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 overflow-x-auto">
            {(["7d", "30d", "this_month", "this_year"] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleDateChange(range)}
                disabled={isPending}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  dateRange === range 
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {range === "7d" && "Últimos 7 días"}
                {range === "30d" && "Últimos 30 días"}
                {range === "this_month" && "Este Mes"}
                {range === "this_year" && "Este Año"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1.5 border border-gray-800 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer [color-scheme:dark]"
              />
              <span className="text-gray-600 text-xs">al</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
            <Button
              onClick={handleCustomDateApply}
              disabled={isPending || !customStart || !customEnd}
              className={`text-xs px-3 py-1.5 rounded transition-all duration-200 cursor-pointer ${
                dateRange === "custom"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              Aplicar
            </Button>
          </div>
          
          <Button 
            onClick={handleExportCSV} 
            className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 shadow-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-1/3 animate-[slideRight_1s_ease-in-out_infinite]"></div>
        </div>
      )}

      {/* Cuadrícula de Fichas de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ingresos */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-blue-500/50 transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
              Ventas
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Ingresos Totales</p>
          <h3 className="text-3xl font-bold text-white mt-1">${data.sales.totalRevenue.toFixed(2)}</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">AOV: <span className="text-white">${data.sales.aov.toFixed(2)}</span></span>
            <span className="text-yellow-400">{data.sales.pendingOrdersCount} pendientes</span>
          </div>
        </Card>

        {/* Inventario */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-purple-500/50 transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full">
              Singles
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Valor del Inventario</p>
          <h3 className="text-3xl font-bold text-white mt-1">${data.inventory.totalValue.toFixed(2)}</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">Métrica Global (No filtrada por fecha)</span>
          </div>
        </Card>

        {/* Torneos */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-orange-500/50 transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-orange-500/10 text-orange-400 rounded-full">
              Comunidad
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Asistencia Promedio</p>
          <h3 className="text-3xl font-bold text-white mt-1">{data.tournaments.avgAttendance.toFixed(1)} <span className="text-lg font-normal text-gray-500">jugadores/torneo</span></h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">{data.tournaments.upcomingCount} torneos próximos</span>
          </div>
        </Card>

        {/* Solicitudes de compra (Buylist) */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-green-500/50 transition-colors group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 text-green-400 rounded-xl group-hover:scale-110 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
              Compras
            </span>
          </div>
          <p className="text-gray-400 text-sm font-medium">Valor Buylist Pendiente</p>
          <h3 className="text-3xl font-bold text-white mt-1">${data.buylist.pendingValue.toFixed(2)}</h3>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">Vol. Aprobado: <span className="text-white">${data.buylist.approvedVolume.toFixed(2)}</span></span>
          </div>
        </Card>
      </div>

      {/* Sección de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-[#1a1c23] border-gray-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Tendencia de Ventas
            </h3>
          </div>
          <div className="h-80 w-full">
            {data.sales.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sales.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                    itemStyle={{ color: '#60a5fa' }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Ventas']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Bar dataKey="amount" fill="url(#colorSales)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No hay datos de ventas para este periodo.
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-6 bg-[#1a1c23] border-gray-800 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          {/* Brillo estético de fondo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-700 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 transform rotate-3 group-hover:rotate-6 transition-transform duration-300">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Visión Estratégica</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                El dashboard actualiza los datos basándose en el rango de fechas seleccionado. Usa esta información para analizar picos de demanda y preparar el inventario.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
