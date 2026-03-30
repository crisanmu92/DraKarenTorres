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
        take: 6,
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
      <header className="grid gap-4 rounded-[28px] border border-(--color-line) bg-white p-5 shadow-(--shadow-card) lg:grid-cols-[1.25fr_0.75fr] lg:p-7">
        <div className="space-y-5">
          <div className="inline-flex w-fit rounded-full border border-[#dbe4ee] bg-[#f7fafc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f172a]">
            Dashboard financiero
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight text-(--color-ink) sm:text-4xl lg:text-5xl">
              Control de clientes y flujo de caja
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-(--color-muted) sm:text-base">
              Una estructura mucho mas cercana a una app financiera: numeros claros, actividad reciente y acceso rapido a ingresos, egresos y reportes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                Periodo
              </p>
              <p className="mt-2 text-lg font-semibold text-(--color-ink)">{currentMonthLabel}</p>
            </div>
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                Caja de hoy
              </p>
              <p className="mt-2 text-lg font-semibold text-(--color-ink)">{formatMoney(dailyBalance)}</p>
            </div>
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                Ticket promedio
              </p>
              <p className="mt-2 text-lg font-semibold text-(--color-ink)">{formatMoney(averageTicket)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <div className="rounded-[24px] border border-[#dbe4ee] bg-[#0f172a] p-5 text-white shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
              Resultado neto
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {formatMoney(monthlyUtility)}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Margen del mes: {formatPercent(utilityMargin)}.
            </p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[#22c55e]"
                style={{ width: `${Math.max(10, Math.min(utilityMargin, 100))}%` }}
              />
            </div>
          </div>

          <OverviewPanel
            title="Estado"
            value={summary.warning ? "Revisar base" : "Todo al dia"}
            description={summary.warning ?? "La app ya esta orientada a clientes, movimientos y reportes."}
          />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes"
          value={String(patientCount)}
          helper={`${upcomingFollowUps} clientes con seguimiento en los proximos 7 dias.`}
        />
        <MetricCard
          label="Ingresos del mes"
          value={formatMoney(monthlyIncome)}
          helper={`${summary.revenueCount} ingresos registrados en el periodo actual.`}
          tone="positive"
        />
        <MetricCard
          label="Costos del mes"
          value={formatMoney(monthlyCosts)}
          helper={`${summary.expenseCount} egresos registrados en el periodo actual.`}
          tone="negative"
        />
        <MetricCard
          label="Utilidad mensual"
          value={formatMoney(monthlyUtility)}
          helper={`Margen acumulado del mes: ${formatPercent(utilityMargin)}.`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Resumen"
            title="Ingresos vs costos"
            description="Una lectura mucho mas de software financiero: cuanto entro, cuanto salio y que tanto queda."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Ingresos</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(monthlyIncome)}</p>
              <p className="mt-2 text-sm text-(--color-muted)">Flujo positivo acumulado del mes.</p>
            </div>
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#fff7f5] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Egresos</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(monthlyCosts)}</p>
              <p className="mt-2 text-sm text-(--color-muted)">Salidas registradas en el mes.</p>
            </div>
            <div className="rounded-3xl border border-[#dbe4ee] bg-[#f3fbf6] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Utilidad</p>
              <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{formatMoney(monthlyUtility)}</p>
              <p className="mt-2 text-sm text-(--color-muted)">Resultado actual del periodo.</p>
            </div>
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Atajos"
            title="Panel de control"
            description="Accesos pensados como una app de operaciones financieras."
          />
          <div className="mt-6 grid gap-3">
            <a href="/pacientes" className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-(--color-ink)">
              Ir a clientes
            </a>
            <a href="/ingresos" className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-(--color-ink)">
              Registrar ingreso
            </a>
            <a href="/egresos" className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-(--color-ink)">
              Registrar egreso
            </a>
            <a href="/reportes" className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4 text-sm font-semibold text-(--color-ink)">
              Ver reportes
            </a>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Clientes"
            title="Clientes recientes"
            description="Los registros nuevos quedan visibles como un feed simple y util."
          />
          <div className="mt-6 grid gap-3">
            {recentPatients.length === 0 ? (
              <EmptyState>Aun no hay clientes registrados.</EmptyState>
            ) : (
              recentPatients.map((patient) => (
                <div key={patient.id} className="rounded-3xl border border-[#dbe4ee] bg-[#f8fbff] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{patient.firstName} {patient.lastName}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{patient.phone}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--color-muted)">
                      {formatDate(patient.nextVisitAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Actividad reciente"
            title="Ultimos ingresos"
            description="Movimientos recientes presentados como una lista compacta de transacciones."
          />
          <div className="mt-6 grid gap-3">
            {recentRevenues.length === 0 ? (
              <EmptyState>Aun no hay ingresos registrados.</EmptyState>
            ) : (
              recentRevenues.map((revenue) => (
                <div key={revenue.id} className="rounded-3xl border border-[#dbe4ee] bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">
                        {revenue.patient.firstName} {revenue.patient.lastName}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {revenue.saleItem.name} · {paymentMethodLabels[revenue.paymentMethod]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#16a34a]">{formatMoney(revenue.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(revenue.occurredAt)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Costos"
            title="Categorias con mayor peso"
            description="Bloque visual tipo finanzas para detectar rapido donde se concentra el gasto."
          />
          <div className="mt-6 grid gap-3">
            {expenseBreakdown.length === 0 ? (
              <EmptyState>No hay egresos suficientes este mes para desglosar categorias.</EmptyState>
            ) : (
              expenseBreakdown.map((item) => (
                <div key={item.category} className="grid gap-2 rounded-3xl border border-[#dbe4ee] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-(--color-ink)">{expenseCategoryLabels[item.category]}</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(item.total)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-[#edf2f7]">
                    <div className="h-2 rounded-full bg-[#111827]" style={{ width: `${Math.min(item.share, 100)}%` }} />
                  </div>
                  <p className="text-xs text-(--color-muted)">{formatPercent(item.share)} del gasto mensual.</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Egresos recientes"
            title="Ultimas salidas de dinero"
            description="Vista de actividad para seguir pagos y costos recientes."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {recentExpenses.length === 0 ? (
              <EmptyState>Aun no hay egresos registrados.</EmptyState>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="rounded-3xl border border-[#dbe4ee] bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{expense.description}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{expenseCategoryLabels[expense.category]}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#b91c1c]">{formatMoney(expense.amount)}</p>
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
