"use server";

import { prisma } from "@/lib/db";
import { startOfMonth, startOfYear, subDays } from "date-fns";

export type DateRangeFilter = "7d" | "30d" | "this_month" | "this_year" | "custom";

function getDates(range: DateRangeFilter, customStart?: string, customEnd?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate = subDays(now, 30);
  let endDate = now;

  if (range === "custom") {
    if (customStart) {
      startDate = new Date(customStart + "T00:00:00");
    }
    if (customEnd) {
      endDate = new Date(customEnd + "T23:59:59.999");
    }
    return { startDate, endDate };
  }

  switch (range) {
    case "7d":
      startDate = subDays(now, 7);
      break;
    case "30d":
      startDate = subDays(now, 30);
      break;
    case "this_month":
      startDate = startOfMonth(now);
      break;
    case "this_year":
      startDate = startOfYear(now);
      break;
  }

  return { startDate, endDate };
}

export async function getDashboardMetrics(
  range: DateRangeFilter = "30d",
  customStart?: string,
  customEnd?: string
) {
  const { startDate, endDate } = getDates(range, customStart, customEnd);

  // 1. Sales & Revenue
  const confirmedOrders = await prisma.order.findMany({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { totalPrice: true },
  });

  const totalRevenue = confirmedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const aov = confirmedOrders.length > 0 ? totalRevenue / confirmedOrders.length : 0;

  const pendingOrdersCount = await prisma.order.count({
    where: { status: "PENDING" },
  });

  // Sales Over Time (Chart Data)
  const ordersOverTimeRaw = await prisma.order.findMany({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      totalPrice: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by day
  const salesMap = new Map<string, number>();
  for (const order of ordersOverTimeRaw) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + (order.totalPrice || 0));
  }
  const salesChartData = Array.from(salesMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));

  // 2. Inventory & Singles
  // For inventory value, we just calculate the total value currently, it's not strictly time-bound.
  const inventoryItems = await prisma.stockItem.findMany({
    select: { quantity: true, salePrice: true },
  });
  const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.quantity * (item.salePrice || 0)), 0);

  // 3. Tournaments
  const tournaments = await prisma.tournament.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  const totalRegistrations = tournaments.reduce((sum, t) => sum + t._count.registrations, 0);
  const avgAttendance = tournaments.length > 0 ? totalRegistrations / tournaments.length : 0;

  const upcomingTournamentsCount = await prisma.tournament.count({
    where: { status: "UPCOMING" },
  });

  // 4. Buylist Operations
  const pendingBuylistRequests = await prisma.buylistRequest.findMany({
    where: { status: "PENDING" },
    select: { totalPrice: true },
  });
  const pendingBuylistValue = pendingBuylistRequests.reduce((sum, req) => sum + req.totalPrice, 0);

  const approvedBuylistRequests = await prisma.buylistRequest.findMany({
    where: {
      status: "APPROVED",
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { totalPrice: true },
  });
  const approvedBuylistVolume = approvedBuylistRequests.reduce((sum, req) => sum + req.totalPrice, 0);

  return {
    sales: {
      totalRevenue,
      aov,
      pendingOrdersCount,
      chartData: salesChartData,
    },
    inventory: {
      totalValue: totalInventoryValue,
    },
    tournaments: {
      avgAttendance,
      upcomingCount: upcomingTournamentsCount,
    },
    buylist: {
      pendingValue: pendingBuylistValue,
      approvedVolume: approvedBuylistVolume,
    },
  };
}
