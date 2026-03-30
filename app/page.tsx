import { ExpenseCategory, PaymentMethod } from "@prisma/client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { getDashboardSummary } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
});

const sectionCardClassName =
  "rounded-4xl border border-(--color-line) bg-white/88 p-5 shadow-(--shadow-card) sm:p-6";

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  UTILITIES: "Servicios",
  PAYROLL: "Nomina",
  SUPPLIES: "Insumos",
  MARKETING: "Marketing",
  RENT: "Arriendo",
  SOFTWARE: "Software",
  TAXES: "Impuestos",
  OTHER: "Otros",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};

type MenuSection = {
  title: string;
  defaultOpen?: boolean;
  links: Array<{
    href: string;
    label: string;
  }>;
};

const menuSections: MenuSection[] = [
  {
    title: "Resumen",
    defaultOpen: true,
    links: [
      { href: "#resumen", label: "Indicadores principales" },
      { href: "#operacion", label: "Estado del consultorio" },
    ],
  },
  {
    title: "Finanzas",
    links: [
      { href: "#finanzas", label: "Utilidad mensual" },
      { href: "#gastos", label: "Costos del mes" },
    ],
  },
  {
    title: "Pacientes",
    links: [
      { href: "#pacientes", label: "Base de pacientes" },
      { href: "#actividad", label: "Ingresos recientes" },
    ],
  },
  {
    title: "Inventario y proveedores",
    links: [
      { href: "#operacion", label: "Proveedores activos" },
      { href: "#operacion", label: "Alertas de inventario" },
    ],
  },
];

type RecentPatient = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  nextVisitAt: Date | null;
};

type RecentRevenue = {
  id: string;
  occurredAt: Date;
  amount: unknown;
  paymentMethod: PaymentMethod;
  patient: {
    firstName: string;
    lastName: string;
  };
  saleItem: {
    name: string;
  };
};

type RecentExpense = {
  id: string;
  occurredAt: Date;
  amount: unknown;
  category: ExpenseCategory;
  description: string;
};

type ExpenseBreakdownItem = {
  category: ExpenseCategory;
  total: number;
  share: number;
};

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

function formatMoney(value: unknown) {
  return currencyFormatter.format(toNumber(value));
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return dateFormatter.format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-(--color-line) bg-[var(--color-panel)]/45 px-4 py-5 text-sm text-(--color-muted)">
      {children}
    </div>
  );
}

function QuickMenu() {
  return (
    <div className="grid gap-3">
      {menuSections.map((section) => (
        <details
          key={section.title}
          className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/50 px-4 py-3"
          open={section.defaultOpen}
        >
          <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
            {section.title}
          </summary>
          <div className="mt-3 grid gap-2 text-sm">
            {section.links.map((link) => (
              <a
                key={`${section.title}-${link.href}-${link.label}`}
                href={link.href}
                className="rounded-2xl bg-white/90 px-3 py-2 text-(--color-ink)"
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink) sm:text-4xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-7 text-(--color-muted)">{description}</p>
    </div>
  );
}

export default async function Home() {
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
  let recentPatients: RecentPatient[] = [];
  let recentRevenues: RecentRevenue[] = [];
  let recentExpenses: RecentExpense[] = [];
  let expenseBreakdown: ExpenseBreakdownItem[] = [];

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
          where: {
            occurredAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.expense
        .aggregate({
          _sum: { amount: true },
          where: {
            occurredAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
        })
        .then((result) => toNumber(result._sum.amount)),
      prisma.revenue
        .aggregate({
          _avg: { amount: true },
          where: {
            occurredAt: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
        })
        .then((result) => toNumber(result._avg.amount)),
      prisma.patient.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          nextVisitAt: true,
        },
      }),
      prisma.revenue.findMany({
        orderBy: [{ occurredAt: "desc" }],
        take: 5,
        select: {
          id: true,
          occurredAt: true,
          amount: true,
          paymentMethod: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          saleItem: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.expense.findMany({
        orderBy: [{ occurredAt: "desc" }],
        take: 5,
        select: {
          id: true,
          occurredAt: true,
          amount: true,
          category: true,
          description: true,
        },
      }),
      prisma.expense
        .groupBy({
          by: ["category"],
          _sum: { amount: true },
          where: {
            occurredAt: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
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
  } catch {
    // Keep the dashboard renderable while the database is unavailable.
  }

  const monthlyUtility = summary.balanceMonthTotal;
  const monthlyCosts = summary.expenseMonthTotal;
  const monthlyIncome = summary.incomeMonthTotal;
  const utilityMargin = monthlyIncome > 0 ? (monthlyUtility / monthlyIncome) * 100 : 0;
  const dailyBalance = incomeTodayTotal - expenseTodayTotal;

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top,rgba(214,193,167,0.28),transparent_48%),linear-gradient(180deg,rgba(251,247,242,0.98),rgba(246,238,228,0.88))]" />

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-8 sm:py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside className="grid gap-4 self-start lg:sticky lg:top-6">
          <article className="rounded-4xl border border-(--color-line) bg-white/90 p-5 shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
              Menu
            </p>
            <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink)">
              Dashboard
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--color-muted)">
              La portada queda solo para visualizar el estado del consultorio.
            </p>
            <div className="mt-4">
              <QuickMenu />
            </div>
          </article>

          <article className="rounded-4xl border border-(--color-line) bg-[#f3eadf] p-5 shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
              Vista rapida
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl bg-white/75 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                  Pacientes totales
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--color-ink)">{patientCount}</p>
              </div>
              <div className="rounded-3xl bg-white/75 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                  Utilidad mensual
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--color-ink)">
                  {formatMoney(monthlyUtility)}
                </p>
              </div>
              <div className="rounded-3xl bg-white/75 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                  Costos del mes
                </p>
                <p className="mt-2 text-2xl font-semibold text-(--color-ink)">
                  {formatMoney(monthlyCosts)}
                </p>
              </div>
            </div>
          </article>
        </aside>

        <div className="grid gap-6">
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
                  Aqui solo visualizas pacientes, utilidad mensual, costos mensuales y el estado
                  general del negocio hasta la fecha.
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
                description={
                  summary.warning ?? "La portada muestra solo informacion ejecutiva del consultorio."
                }
              />
            </div>
          </header>

          <section id="resumen" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Pacientes"
              value={String(patientCount)}
              helper={`${upcomingFollowUps} pacientes con control en los proximos 7 dias.`}
              tone="neutral"
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

          <section id="finanzas" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className={sectionCardClassName}>
              <SectionHeading
                eyebrow="Finanzas"
                title="Utilidad y caja mensual"
                description="Lectura ejecutiva para que veas rapido si el mes va sano, cuanto ha entrado y cuanto ha salido."
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                    Utilidad actual
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                    {formatMoney(monthlyUtility)}
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                    Costos del mes
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                    {formatMoney(monthlyCosts)}
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                    Caja de hoy
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                    {formatMoney(dailyBalance)}
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                    Ticket promedio
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                    {formatMoney(averageTicket)}
                  </p>
                </div>
              </div>
            </article>

            <article id="gastos" className={sectionCardClassName}>
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
          </section>

          <section id="operacion" className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <article className={sectionCardClassName}>
              <SectionHeading
                eyebrow="Operacion"
                title="Estado general del consultorio"
                description="Indicadores que conviene tener visibles en la portada aunque no estes registrando datos desde aqui."
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-sm font-semibold text-(--color-ink)">Proveedores activos</p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{supplierCount}</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Contactos disponibles para compras y reposicion.
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-sm font-semibold text-(--color-ink)">Productos activos</p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{productCount}</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Materia prima o productos actualmente registrados.
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-sm font-semibold text-(--color-ink)">Items de venta</p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">{saleItemCount}</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Tratamientos o productos que generan ingresos.
                  </p>
                </div>
                <div className="rounded-3xl bg-(--color-panel) p-5">
                  <p className="text-sm font-semibold text-(--color-ink)">Alertas de inventario</p>
                  <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                    {summary.lowStockProductsCount + summary.nearExpiryProductsCount}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    {summary.lowStockProductsCount} con stock bajo y {summary.nearExpiryProductsCount} proximos a vencer.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-4xl border border-(--color-line) bg-[#f4ebe1] p-5 shadow-(--shadow-card) sm:p-6">
              <SectionHeading
                eyebrow="Prioridades"
                title="Lo importante para revisar hoy"
                description="Esta columna resume lo que mas valor te da revisar al abrir el sistema."
              />

              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl border border-(--color-line) bg-white/80 px-4 py-4">
                  <p className="text-sm font-semibold text-(--color-ink)">Utilidad mensual</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Si baja demasiado frente a ingresos, revisa costos del mes y gastos por categoria.
                  </p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white/80 px-4 py-4">
                  <p className="text-sm font-semibold text-(--color-ink)">Controles proximos</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Hay {upcomingFollowUps} pacientes con seguimiento cercano.
                  </p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white/80 px-4 py-4">
                  <p className="text-sm font-semibold text-(--color-ink)">Caja diaria</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                    Hoy han entrado {formatMoney(incomeTodayTotal)} y han salido {formatMoney(expenseTodayTotal)}.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section id="pacientes" className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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
                    <div
                      key={patient.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <p className="font-semibold text-(--color-ink)">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">{patient.phone}</p>
                      <p className="mt-2 text-sm text-(--color-muted)">
                        Proximo control: {formatDate(patient.nextVisitAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article id="actividad" className={sectionCardClassName}>
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
        </div>
      </section>
    </main>
  );
}
