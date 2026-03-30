import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { EmptyState, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import {
  expenseCategoryLabels,
  formatDate,
  formatMoney,
  formatPercent,
  monthFormatter,
  paymentMethodLabels,
  toNumber,
} from "@/lib/clinic-format";
import { getDashboardSummary } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const now = new Date();
  const currentMonthLabel = monthFormatter.format(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  let patientCount = 0;
  let supplierCount = 0;
  let productCount = 0;
  let saleItemCount = 0;
  let upcomingFollowUps = 0;
  let incomeTodayTotal = 0;
  let expenseTodayTotal = 0;
  let averageTicket = 0;
  let recentPatients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    nextVisitAt: Date | null;
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
  let expenseBreakdown: Array<{
    category: keyof typeof expenseCategoryLabels;
    total: number;
    share: number;
  }> = [];

  try {
    [
      patientCount,
      supplierCount,
      productCount,
      saleItemCount,
      upcomingFollowUps,
      incomeTodayTotal,
      expenseTodayTotal,
      averageTicket,
      recentPatients,
      recentRevenues,
      recentExpenses,
      expenseBreakdown,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.saleItem.count(),
      prisma.patient.count({
        where: {
          nextVisitAt: {
            gte: now,
            lte: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
          },
        },
      }),
      prisma.revenue
        .aggregate({
          _sum: { amount: true },
          where: { occurredAt: { gte: todayStart, lt: tomorrowStart } },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.expense
        .aggregate({
          _sum: { amount: true },
          where: { occurredAt: { gte: todayStart, lt: tomorrowStart } },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.revenue
        .aggregate({
          _avg: { amount: true },
          where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
        })
        .then((result) => toNumber(result._avg.amount)),
      prisma.patient.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        select: { id: true, firstName: true, lastName: true, phone: true, nextVisitAt: true },
      }),
      prisma.revenue.findMany({
        orderBy: [{ occurredAt: "desc" }],
        take: 5,
        select: {
          id: true,
          occurredAt: true,
          amount: true,
          paymentMethod: true,
          patient: { select: { firstName: true, lastName: true } },
          saleItem: { select: { name: true } },
        },
      }),
      prisma.expense.findMany({
        orderBy: [{ occurredAt: "desc" }],
        take: 5,
        select: { id: true, occurredAt: true, amount: true, category: true, description: true },
      }),
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
    ]);
  } catch {}

  const monthlyUtility = summary.balanceMonthTotal;
  const monthlyCosts = summary.expenseMonthTotal;
  const monthlyIncome = summary.incomeMonthTotal;
  const utilityMargin = monthlyIncome > 0 ? (monthlyUtility / monthlyIncome) * 100 : 0;
  const dailyBalance = incomeTodayTotal - expenseTodayTotal;

  return (
    <>
      <header className="grid gap-5 rounded-[32px] border border-white/80 bg-white/84 p-5 shadow-(--shadow-card) backdrop-blur md:grid-cols-[1.4fr_0.9fr] sm:p-7 lg:rounded-[36px] lg:p-10">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-(--color-muted)">
            Sistema privado del consultorio
          </p>
          <div className="space-y-3">
            <h1 className="font-display text-4xl leading-none tracking-[-0.03em] text-(--color-ink) sm:text-5xl lg:text-6xl">
              Dashboard principal del consultorio
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-(--color-muted) sm:text-base lg:text-lg">
              Aqui visualizas pacientes, utilidad mensual, costos mensuales y el estado general del negocio.
            </p>
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <OverviewPanel
            title="Periodo activo"
            value={currentMonthLabel}
            description="Corte mensual dinamico basado en la fecha actual."
          />
          <OverviewPanel
            title="Estado"
            value={summary.warning ? "Revisar base" : "Operacion al dia"}
            description={summary.warning ?? "La portada muestra solo informacion ejecutiva del consultorio."}
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pacientes"
          value={String(patientCount)}
          helper={`${upcomingFollowUps} pacientes con control en los proximos 7 dias.`}
        />
        <MetricCard
          label="Utilidad mensual"
          value={formatMoney(monthlyUtility)}
          helper={`Margen acumulado del mes: ${formatPercent(utilityMargin)}.`}
          tone="positive"
        />
        <MetricCard
          label="Costos mensuales"
          value={formatMoney(monthlyCosts)}
          helper={`${summary.expenseCount} egresos registrados en el periodo actual.`}
          tone="negative"
        />
        <MetricCard
          label="Ingresos mensuales"
          value={formatMoney(monthlyIncome)}
          helper={`${summary.revenueCount} ingresos registrados en el periodo actual.`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Finanzas"
            title="Utilidad y caja mensual"
            description="Lectura ejecutiva para ver rapido si el mes va sano, cuanto ha entrado y cuanto ha salido."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-(--color-panel) p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Utilidad actual</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(monthlyUtility)}</p>
            </div>
            <div className="rounded-3xl bg-(--color-panel) p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Costos del mes</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(monthlyCosts)}</p>
            </div>
            <div className="rounded-3xl bg-(--color-panel) p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Caja de hoy</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(dailyBalance)}</p>
            </div>
            <div className="rounded-3xl bg-(--color-panel) p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Ticket promedio</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(averageTicket)}</p>
            </div>
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Gasto del mes"
            title="Costos mensuales por categoria"
            description="Desglose rapido para ver en que rubros se esta yendo mas dinero."
          />
          <div className="mt-6 grid gap-3">
            {expenseBreakdown.length === 0 ? (
              <EmptyState>No hay egresos suficientes este mes para desglosar categorias.</EmptyState>
            ) : (
              expenseBreakdown.map((item) => (
                <div key={item.category} className="grid gap-2 rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-(--color-ink)">{expenseCategoryLabels[item.category]}</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(item.total)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-panel)]">
                    <div className="h-2 rounded-full bg-[#171311]" style={{ width: `${Math.min(item.share, 100)}%` }} />
                  </div>
                  <p className="text-xs text-(--color-muted)">{formatPercent(item.share)} del gasto mensual.</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Pacientes"
            title="Pacientes recientes"
            description="Vista rapida de los ultimos pacientes creados y sus proximos controles."
          />
          <div className="mt-6 grid gap-3">
            {recentPatients.length === 0 ? (
              <EmptyState>Aun no hay pacientes registrados.</EmptyState>
            ) : (
              recentPatients.map((patient) => (
                <div key={patient.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="font-semibold text-(--color-ink)">{patient.firstName} {patient.lastName}</p>
                  <p className="mt-1 text-sm text-(--color-muted)">{patient.phone}</p>
                  <p className="mt-2 text-sm text-(--color-muted)">Proximo control: {formatDate(patient.nextVisitAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Actividad"
            title="Ingresos recientes"
            description="Ultimos movimientos de caja positivos registrados en el sistema."
          />
          <div className="mt-6 grid gap-3">
            {recentRevenues.length === 0 ? (
              <EmptyState>Aun no hay ingresos registrados.</EmptyState>
            ) : (
              recentRevenues.map((revenue) => (
                <div key={revenue.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{revenue.patient.firstName} {revenue.patient.lastName}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {revenue.saleItem.name} · {paymentMethodLabels[revenue.paymentMethod]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(revenue.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(revenue.occurredAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Proveedores" value={String(supplierCount)} helper="Contactos disponibles para compras y reposicion." />
        <MetricCard label="Productos" value={String(productCount)} helper="Materia prima o productos activos en el sistema." />
        <MetricCard label="Items de venta" value={String(saleItemCount)} helper="Tratamientos o productos que generan ingresos." />
      </section>

      <section className="grid gap-4">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Costos"
            title="Egresos recientes"
            description="Ultimos gastos registrados para tener contexto inmediato del mes."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentExpenses.length === 0 ? (
              <EmptyState>Aun no hay egresos registrados.</EmptyState>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{expense.description}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{expenseCategoryLabels[expense.category]}</p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(expense.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(expense.occurredAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </>
  );
}
