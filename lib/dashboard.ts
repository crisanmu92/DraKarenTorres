import "server-only";

import { prisma } from "@/lib/prisma";

function getCurrentMonthRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { monthStart, nextMonthStart };
}

function toNumber(value: unknown) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

export type DashboardSummary = {
  incomeMonthTotal: number;
  expenseMonthTotal: number;
  balanceMonthTotal: number;
  revenueCount: number;
  expenseCount: number;
  lowStockProductsCount: number;
  nearExpiryProductsCount: number;
  warning: string | null;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { monthStart, nextMonthStart } = getCurrentMonthRange();
  const nearExpiryLimit = new Date();
  nearExpiryLimit.setDate(nearExpiryLimit.getDate() + 45);

  try {
    const [
      incomeAggregate,
      expenseAggregate,
      revenueCount,
      expenseCount,
      lowStockProductsCount,
      nearExpiryProductsCount,
    ] = await Promise.all([
      prisma.revenue.aggregate({
        _sum: { amount: true },
        where: {
          occurredAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          occurredAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.revenue.count({
        where: {
          occurredAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.expense.count({
        where: {
          occurredAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      prisma.product.count({
        where: {
          isActive: true,
          stockQuantity: {
            lte: prisma.product.fields.minStockQuantity,
          },
        },
      }),
      prisma.product.count({
        where: {
          isActive: true,
          expiresAt: {
            gte: new Date(),
            lte: nearExpiryLimit,
          },
        },
      }),
    ]);

    const incomeMonthTotal = toNumber(incomeAggregate._sum.amount);
    const expenseMonthTotal = toNumber(expenseAggregate._sum.amount);

    return {
      incomeMonthTotal,
      expenseMonthTotal,
      balanceMonthTotal: incomeMonthTotal - expenseMonthTotal,
      revenueCount,
      expenseCount,
      lowStockProductsCount,
      nearExpiryProductsCount,
      warning: null,
    };
  } catch {
    return {
      incomeMonthTotal: 0,
      expenseMonthTotal: 0,
      balanceMonthTotal: 0,
      revenueCount: 0,
      expenseCount: 0,
      lowStockProductsCount: 0,
      nearExpiryProductsCount: 0,
      warning:
        "El dashboard usa valores iniciales hasta que ejecutes la primera migracion y registres informacion real.",
    };
  }
}
