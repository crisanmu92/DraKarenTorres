import { EmptyState, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  expenseCategoryLabels,
  formatDate,
  formatMoney,
  formatPercent,
  monthFormatter,
  paymentMethodLabels,
  toNumber,
} from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getMonthRange(monthValue?: string) {
  const now = new Date();

  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      selectedMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      monthStart,
      nextMonthStart: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const monthStart = new Date(year, monthIndex, 1);

  return {
    selectedMonth: monthValue,
    monthStart,
    nextMonthStart: new Date(year, monthIndex + 1, 1),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { selectedMonth, monthStart, nextMonthStart } = getMonthRange(
    resolvedSearchParams?.month,
  );

  let incomeTotal = 0;
  let expenseTotal = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let averageIncome = 0;
  let expenseBreakdown: Array<{
    category: keyof typeof expenseCategoryLabels;
    total: number;
    share: number;
  }> = [];
  let recentRevenues: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    paymentMethod: "CASH" | "TRANSFER" | "CARD";
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
  }> = [];
  let recentExpenses: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    category: keyof typeof expenseCategoryLabels;
    description: string;
  }> = [];

  try {
    [
      incomeTotal,
      expenseTotal,
      incomeCount,
      expenseCount,
      averageIncome,
      expenseBreakdown,
      recentRevenues,
      recentExpenses,
    ] = await Promise.all([
      prisma.revenue
        .aggregate({
          _sum: { amount: true },
          where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.expense
        .aggregate({
          _sum: { amount: true },
          where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.revenue.count({
        where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.expense.count({
        where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.revenue
        .aggregate({
          _avg: { amount: true },
          where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        })
        .then((result) => toNumber(result._avg.amount)),
      prisma.expense
        .groupBy({
          by: ["category"],
          _sum: { amount: true },
          where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        })
        .then((rows) => {
          const total = rows.reduce((acc, row) => acc + toNumber(row._sum.amount), 0);
          return rows
            .map((row) => {
              const rowTotal = toNumber(row._sum.amount);
              return {
                category: row.category,
                total: rowTotal,
                share: total > 0 ? (rowTotal / total) * 100 : 0,
              };
            })
            .sort((a, b) => b.total - a.total);
        }),
      prisma.revenue.findMany({
        where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        include: { patient: true, saleItem: true },
        orderBy: [{ occurredAt: "desc" }],
        take: 8,
      }),
      prisma.expense.findMany({
        where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        orderBy: [{ occurredAt: "desc" }],
        take: 8,
      }),
    ]);
  } catch {}

  const utility = incomeTotal - expenseTotal;
  const utilityMargin = incomeTotal > 0 ? (utility / incomeTotal) * 100 : 0;
  const monthLabel = monthFormatter.format(monthStart);

  return (
    <>
      <SectionHeading
        eyebrow="Reportes"
        title="Resumen financiero por mes"
        description="Filtra por mes para ver ingresos, egresos, utilidad y el detalle de costos del periodo."
      />

      <article className={sectionCardClassName}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
              Periodo consultado
            </p>
            <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink)">
              {monthLabel}
            </h2>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                Filtrar por mes
              </span>
              <input
                type="month"
                name="month"
                defaultValue={selectedMonth}
                className="w-full rounded-2xl border border-(--color-line) bg-[#fffdfa] px-4 py-3 text-sm text-(--color-ink) outline-none transition focus:border-[#171311]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[#181311] px-5 py-3 text-sm font-semibold text-[#fffdf9]"
            >
              Ver reporte
            </button>
          </form>
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ingresos del mes"
          value={formatMoney(incomeTotal)}
          helper={`${incomeCount} ingresos registrados en el periodo.`}
          tone="positive"
        />
        <MetricCard
          label="Egresos del mes"
          value={formatMoney(expenseTotal)}
          helper={`${expenseCount} egresos registrados en el periodo.`}
          tone="negative"
        />
        <MetricCard
          label="Utilidad del mes"
          value={formatMoney(utility)}
          helper={`Margen del periodo: ${formatPercent(utilityMargin)}.`}
        />
        <MetricCard
          label="Ingreso promedio"
          value={formatMoney(averageIncome)}
          helper="Promedio por movimiento de ingreso del mes."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Detalle de costos"
            title="Egresos por categoria"
            description="Te muestra en que rubros se fue el dinero durante el mes consultado."
          />

          <div className="mt-6 grid gap-3">
            {expenseBreakdown.length === 0 ? (
              <EmptyState>No hay egresos en este mes para desglosar categorias.</EmptyState>
            ) : (
              expenseBreakdown.map((item) => (
                <div
                  key={item.category}
                  className="grid gap-2 rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {expenseCategoryLabels[item.category]}
                    </p>
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {formatMoney(item.total)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-panel)]">
                    <div
                      className="h-2 rounded-full bg-[#171311]"
                      style={{ width: `${Math.min(item.share, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-(--color-muted)">
                    {formatPercent(item.share)} del gasto mensual.
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Lectura rapida"
            title="Conclusiones del mes"
            description="Resumen rapido para saber si el mes va sano y donde mirar primero."
          />

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-sm font-semibold text-(--color-ink)">Resultado neto</p>
              <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                {utility >= 0
                  ? `El mes va con utilidad de ${formatMoney(utility)}.`
                  : `El mes va con perdida de ${formatMoney(Math.abs(utility))}.`}
              </p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-sm font-semibold text-(--color-ink)">Nivel de gasto</p>
              <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                Se han registrado {formatMoney(expenseTotal)} en costos durante el periodo.
              </p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-sm font-semibold text-(--color-ink)">Promedio de ingreso</p>
              <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                Cada ingreso del mes promedia {formatMoney(averageIncome)}.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Ingresos recientes"
            title="Ultimos ingresos del mes"
            description="Movimientos positivos mas recientes dentro del mes filtrado."
          />

          <div className="mt-6 grid gap-3">
            {recentRevenues.length === 0 ? (
              <EmptyState>No hay ingresos en el mes consultado.</EmptyState>
            ) : (
              recentRevenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">
                        {revenue.patient.firstName} {revenue.patient.lastName}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {revenue.saleItem.name} · {paymentMethodLabels[revenue.paymentMethod]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {formatMoney(revenue.amount)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">
                    {formatDate(revenue.occurredAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Egresos recientes"
            title="Ultimos egresos del mes"
            description="Movimientos de salida mas recientes dentro del mes filtrado."
          />

          <div className="mt-6 grid gap-3">
            {recentExpenses.length === 0 ? (
              <EmptyState>No hay egresos en el mes consultado.</EmptyState>
            ) : (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{expense.description}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {expenseCategoryLabels[expense.category]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {formatMoney(expense.amount)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">
                    {formatDate(expense.occurredAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}
