import {
  ExpenseCategory,
  InventoryMovementType,
  InventoryUnit,
  PaymentMethod,
  SaleItemType,
} from "@prisma/client";

import {
  createExpense,
  createInventoryMovement,
  createPatient,
  createProduct,
  createRevenue,
  createSaleItem,
  createSupplier,
  deleteExpense,
  deleteInventoryMovement,
  deletePatient,
  deleteProduct,
  deleteRevenue,
  deleteSaleItem,
  deleteSupplier,
  updateExpense,
  updateInventoryMovement,
  updatePatient,
  updateProduct,
  updateRevenue,
  updateSaleItem,
  updateSupplier,
} from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
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

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const sectionCardClassName =
  "rounded-4xl border border-(--color-line) bg-white/88 p-6 shadow-(--shadow-card)";
const inputClassName =
  "w-full rounded-2xl border border-(--color-line) bg-[#fffdfa] px-4 py-3 text-sm text-(--color-ink) outline-none transition focus:border-[#171311]";
const textareaClassName = `${inputClassName} min-h-28 resize-y`;
const formGridClassName = "grid gap-3 sm:grid-cols-2";

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};

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

const inventoryUnitLabels: Record<InventoryUnit, string> = {
  UNIT: "Unidad",
  BOX: "Caja",
  VIAL: "Vial",
  SYRINGE: "Jeringa",
  ML: "Ml",
  MG: "Mg",
};

const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
  EXPIRATION: "Vencimiento",
  RETURN: "Devolucion",
};

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
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

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Ahora";
  }

  return dateTimeFormatter.format(value);
}

function formatDateInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatDateTimeInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-(--color-muted)">{hint}</span> : null}
    </label>
  );
}

type FormCardProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function FormCard({ id, eyebrow, title, description, children }: FormCardProps) {
  return (
    <article id={id} className={sectionCardClassName}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
        {eyebrow}
      </p>
      <h3 className="mt-3 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink)">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-(--color-muted)">{description}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}

type EmptyStateProps = {
  children: React.ReactNode;
};

function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-(--color-line) bg-[var(--color-panel)]/45 px-4 py-5 text-sm text-(--color-muted)">
      {children}
    </div>
  );
}

type PatientSummary = {
  id: string;
  firstName: string;
  lastName: string;
  identification: string;
};

type SupplierSummary = {
  id: string;
  companyName: string;
};

type ProductSummary = {
  id: string;
  name: string;
  sku: string | null;
};

type SaleItemSummary = {
  id: string;
  name: string;
  type: SaleItemType;
  unitPrice: unknown;
};

type RecentPatient = {
  id: string;
  firstName: string;
  lastName: string;
  identification: string;
  phone: string;
  email: string | null;
  birthDate: Date | null;
  allergies: string | null;
  previousTreatments: string | null;
  importantNotes: string | null;
  lastVisitAt: Date | null;
  nextVisitAt: Date | null;
};

type RecentSupplier = {
  id: string;
  companyName: string;
  commercialAdvisor: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type RecentProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  lotNumber: string;
  stockQuantity: unknown;
  minStockQuantity: unknown;
  unit: InventoryUnit;
  expiresAt: Date | null;
  supplierId: string;
  isActive: boolean;
  supplier: {
    id: string;
    companyName: string;
  };
};

type RecentSaleItem = {
  id: string;
  name: string;
  type: SaleItemType;
  description: string | null;
  unitPrice: unknown;
  productId: string | null;
  product: {
    name: string;
  } | null;
};

type RecentRevenue = {
  id: string;
  occurredAt: Date;
  amount: unknown;
  paymentMethod: PaymentMethod;
  notes: string | null;
  patientId: string;
  saleItemId: string;
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
  notes: string | null;
};

type RecentMovement = {
  id: string;
  occurredAt: Date;
  type: InventoryMovementType;
  quantity: unknown;
  reason: string | null;
  productId: string;
  product: {
    name: string;
  };
};

type ExpenseBreakdownItem = {
  category: ExpenseCategory;
  total: number;
  share: number;
};

type RecordActionsProps = {
  id: string;
  deleteAction: (formData: FormData) => Promise<void>;
  updateLabel?: string;
};

function RecordActions({ id, deleteAction, updateLabel = "Guardar cambios" }: RecordActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <SubmitButton label={updateLabel} pendingLabel="Guardando..." variant="secondary" />
      <SubmitButton
        label="Eliminar"
        pendingLabel="Eliminando..."
        variant="danger"
        formAction={deleteAction}
        name="id"
        value={id}
      />
    </div>
  );
}

export default async function Home() {
  const summary = await getDashboardSummary();
  const currentMonthLabel = monthFormatter.format(new Date());
  const now = new Date();
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
  let expenseBreakdown: ExpenseBreakdownItem[] = [];
  let recentPatients: RecentPatient[] = [];
  let recentSuppliers: RecentSupplier[] = [];
  let recentProducts: RecentProduct[] = [];
  let recentSaleItems: RecentSaleItem[] = [];
  let recentRevenues: RecentRevenue[] = [];
  let recentExpenses: RecentExpense[] = [];
  let recentMovements: RecentMovement[] = [];
  let patients: PatientSummary[] = [];
  let suppliers: SupplierSummary[] = [];
  let products: ProductSummary[] = [];
  let saleItems: SaleItemSummary[] = [];

  try {
    [
      patientCount,
      supplierCount,
      productCount,
      saleItemCount,
      recentPatients,
      recentSuppliers,
      recentProducts,
      recentSaleItems,
      recentRevenues,
      recentExpenses,
      recentMovements,
      upcomingFollowUps,
      incomeTodayTotal,
      expenseTodayTotal,
      averageTicket,
      expenseBreakdown,
      patients,
      suppliers,
      products,
      saleItems,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.saleItem.count(),
      prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.product.findMany({
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.saleItem.findMany({
        include: { product: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.revenue.findMany({
        include: { patient: true, saleItem: true },
        orderBy: { occurredAt: "desc" },
        take: 6,
      }),
      prisma.expense.findMany({
        orderBy: { occurredAt: "desc" },
        take: 6,
      }),
      prisma.inventoryMovement.findMany({
        include: { product: true },
        orderBy: { occurredAt: "desc" },
        take: 6,
      }),
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
          orderBy: {
            _sum: {
              amount: "desc",
            },
          },
        })
        .then((rows) => {
          const total = rows.reduce((acc, row) => acc + toNumber(row._sum.amount), 0);

          return rows.map((row) => {
            const amount = toNumber(row._sum.amount);

            return {
              category: row.category,
              total: amount,
              share: total > 0 ? (amount / total) * 100 : 0,
            };
          });
        }),
      prisma.patient.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, identification: true },
      }),
      prisma.supplier.findMany({
        orderBy: { companyName: "asc" },
        select: { id: true, companyName: true },
      }),
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true },
      }),
      prisma.saleItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true, unitPrice: true },
      }),
    ]);
  } catch {
    // Leave the page renderable even when the database is temporarily unreachable.
  }

  const operationalMargin =
    summary.incomeMonthTotal > 0
      ? (summary.balanceMonthTotal / summary.incomeMonthTotal) * 100
      : 0;
  const dailyBalance = incomeTodayTotal - expenseTodayTotal;

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top,rgba(214,193,167,0.28),transparent_48%),linear-gradient(180deg,rgba(251,247,242,0.98),rgba(246,238,228,0.88))]" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="grid gap-6 rounded-[36px] border border-white/80 bg-white/84 p-7 shadow-(--shadow-card) backdrop-blur md:grid-cols-[1.5fr_0.9fr] lg:p-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-(--color-muted)">
              Sistema Privado del Consultorio
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-5xl leading-none tracking-[-0.03em] text-(--color-ink) sm:text-6xl">
                Gestion diaria clara, privada y ordenada.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-(--color-muted) sm:text-lg">
                Desde esta pagina puedes llevar pacientes, caja, gastos, proveedores, materia
                prima e inventario sin salir del sistema.
              </p>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <OverviewPanel
              title="Periodo activo"
              value={currentMonthLabel}
              description="Corte dinamico basado en la fecha del servidor. Ideal para flujo de caja mensual."
            />
            <OverviewPanel
              title="Estado"
              value={summary.warning ? "Revisar base" : "Listo para registrar"}
              description={
                summary.warning ??
                "Todo esta preparado para registrar y consultar la operacion diaria."
              }
            />
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-4">
            <section id="resumen" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Ingresos del mes"
                value={currencyFormatter.format(summary.incomeMonthTotal)}
                helper={`${summary.revenueCount} ingresos registrados en el periodo actual.`}
                tone="positive"
              />
              <MetricCard
                label="Egresos del mes"
                value={currencyFormatter.format(summary.expenseMonthTotal)}
                helper={`${summary.expenseCount} egresos registrados entre operacion y gastos fijos.`}
                tone="negative"
              />
              <MetricCard
                label="Balance neto"
                value={currencyFormatter.format(summary.balanceMonthTotal)}
                helper="Resultado del mes actual, calculado como ingresos menos egresos."
              />
              <MetricCard
                label="Alertas de inventario"
                value={`${summary.lowStockProductsCount + summary.nearExpiryProductsCount}`}
                helper={`${summary.lowStockProductsCount} con stock bajo y ${summary.nearExpiryProductsCount} proximos a vencer.`}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Pacientes"
                value={String(patientCount)}
                helper={`${upcomingFollowUps} controles programados para los proximos 7 dias.`}
              />
              <MetricCard
                label="Proveedores"
                value={String(supplierCount)}
                helper="Laboratorios y distribuidores registrados."
              />
              <MetricCard
                label="Productos"
                value={String(productCount)}
                helper="Catalogo operativo con stock, lote y vencimiento."
              />
              <MetricCard
                label="Items de venta"
                value={String(saleItemCount)}
                helper="Tratamientos o productos con precio de venta."
              />
            </section>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-6 grid gap-4">
              <article className="rounded-4xl border border-(--color-line) bg-white/90 p-5 shadow-(--shadow-card)">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
                  Menu
                </p>
                <div className="mt-4 grid gap-3">
                  <details className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/55 px-4 py-3" open>
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Pacientes
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm">
                      <a href="#pacientes" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Agregar pacientes</a>
                      <a href="#ingresos" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Registrar ingresos</a>
                    </div>
                  </details>
                  <details className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/55 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Caja y gastos
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm">
                      <a href="#ingresos" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Caja diaria</a>
                      <a href="#egresos" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Gastos</a>
                      <a href="#finanzas" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Utilidades</a>
                    </div>
                  </details>
                  <details className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/55 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Proveedores y materia prima
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm">
                      <a href="#proveedores" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Proveedores</a>
                      <a href="#productos" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Materia prima</a>
                      <a href="#inventario" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Movimientos</a>
                    </div>
                  </details>
                  <details className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/55 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Catalogo
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm">
                      <a href="#precios" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Items de venta</a>
                      <a href="#resumen" className="rounded-2xl bg-white/85 px-3 py-2 text-(--color-ink)">Resumen general</a>
                    </div>
                  </details>
                </div>
              </article>

              <article className="rounded-4xl border border-(--color-line) bg-[#f3eadf] p-5 text-(--color-ink) shadow-(--shadow-card)">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
                  Acciones recomendadas
                </p>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-(--color-ink)">
                  <p>1. Registra pacientes y servicios primero.</p>
                  <p>2. Lleva ingresos y egresos todos los dias.</p>
                  <p>3. Revisa inventario y seguimientos antes de cerrar jornada.</p>
                </div>
              </article>

              <article className="rounded-4xl border border-(--color-line) bg-white/90 p-5 shadow-(--shadow-card)">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
                  Indicadores rapidos
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-3xl bg-[var(--color-panel)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                      Utilidad del mes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-ink)">
                      {formatMoney(summary.balanceMonthTotal)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[var(--color-panel)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                      Caja de hoy
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-ink)">
                      {formatMoney(dailyBalance)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[var(--color-panel)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                      Proximos controles
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-(--color-ink)">
                      {upcomingFollowUps}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </aside>
        </section>

        <section id="finanzas" className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className={sectionCardClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
              Finanzas
            </p>
            <h2 className="mt-3 font-display text-4xl leading-none tracking-[-0.03em] text-(--color-ink)">
              Utilidad, caja y control del gasto
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-(--color-muted)">
              Esta utilidad es operativa: ingresos menos egresos registrados. Ya puedes seguir
              caja del dia, ticket promedio y peso real de cada categoria de gasto.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                  Utilidad operativa
                </p>
                <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                  {formatMoney(summary.balanceMonthTotal)}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)">
                  Margen del mes: {formatPercent(operationalMargin)}
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                  Caja de hoy
                </p>
                <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                  {formatMoney(dailyBalance)}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)">
                  Ingresos {formatMoney(incomeTodayTotal)} · Egresos {formatMoney(expenseTodayTotal)}
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                  Ticket promedio
                </p>
                <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                  {formatMoney(averageTicket)}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)">
                  Promedio por ingreso registrado en el mes.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
                  Seguimientos
                </p>
                <p className="mt-3 text-3xl font-semibold text-(--color-ink)">
                  {upcomingFollowUps}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)">
                  Pacientes con control en los proximos 7 dias.
                </p>
              </div>
            </div>
          </article>

          <article className={sectionCardClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
              Gasto del mes
            </p>
            <h3 className="mt-3 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink)">
              En que se te esta yendo la caja
            </h3>
            <div className="mt-6 grid gap-3">
              {expenseBreakdown.length === 0 ? (
                <EmptyState>Aun no hay egresos suficientes para desglosar categorias.</EmptyState>
              ) : (
                expenseBreakdown.map((item) => (
                  <div key={item.category} className="grid gap-2 rounded-3xl border border-(--color-line) bg-white px-4 py-4">
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
                      {formatPercent(item.share)} del gasto mensual registrado.
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className={sectionCardClassName}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
                  Operacion integral
                </p>
                <h2 className="mt-3 font-display text-4xl leading-none tracking-[-0.03em] text-(--color-ink)">
                  Carga de datos desde la app
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-(--color-muted)">
                El flujo recomendado es: proveedor, producto, item de venta, paciente, ingreso,
                egreso y movimiento de inventario.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Catalogo</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Registra proveedores, productos, precios y servicios antes de empezar a
                  facturar.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Pacientes</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Guarda ficha basica, antecedentes relevantes y fechas de seguimiento.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Caja</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Registra ingresos por venta o tratamiento y egresos categorizados del mes.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Inventario</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Lleva compras, salidas, ajustes, mermas y vencimientos con trazabilidad.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-4xl border border-(--color-line) bg-[#f4ebe1] p-7 text-(--color-ink) shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
              Organizacion
            </p>
            <h2 className="mt-4 font-display text-4xl leading-none tracking-[-0.03em]">
              Trabajo diario del consultorio.
            </h2>
            <p className="mt-4 text-sm leading-7 text-(--color-muted)">
              Esta pagina ya te sirve como centro operativo. Lo siguiente razonable es busqueda
              por nombre, filtros por fecha y reportes mas detallados.
            </p>
            <div className="mt-8 rounded-3xl border border-(--color-line) bg-white/70 p-5">
              <p className="text-sm font-semibold">Prioridades siguientes</p>
              <div className="mt-3 space-y-2 text-sm text-(--color-muted)">
                <p>Busqueda rapida de pacientes.</p>
                <p>Filtros por fecha para caja y gastos.</p>
                <p>Agenda e historia clinica por paciente.</p>
              </div>
            </div>
          </article>
        </section>

        <section id="registro-operativo" className="grid gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
              Modulos operativos
            </p>
            <h2 className="font-display text-4xl leading-none tracking-[-0.03em] text-(--color-ink)">
              Registro diario del consultorio
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-(--color-muted)">
              Todos los formularios de abajo escriben directo en la base de datos de Supabase.
              Carga primero la base maestra y luego la operacion diaria.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FormCard
              id="pacientes"
              eyebrow="Base clinica"
              title="Pacientes"
              description="Crea la ficha inicial del paciente con datos de contacto y seguimiento."
            >
              <form action={createPatient} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Nombres">
                    <input name="firstName" className={inputClassName} required />
                  </Field>
                  <Field label="Apellidos">
                    <input name="lastName" className={inputClassName} required />
                  </Field>
                  <Field label="Identificacion">
                    <input name="identification" className={inputClassName} required />
                  </Field>
                  <Field label="Telefono">
                    <input name="phone" className={inputClassName} required />
                  </Field>
                  <Field label="Correo">
                    <input name="email" type="email" className={inputClassName} />
                  </Field>
                  <Field label="Fecha de nacimiento">
                    <input name="birthDate" type="date" className={inputClassName} />
                  </Field>
                  <Field label="Ultima visita">
                    <input name="lastVisitAt" type="date" className={inputClassName} />
                  </Field>
                  <Field label="Proximo control">
                    <input name="nextVisitAt" type="date" className={inputClassName} />
                  </Field>
                </div>
                <Field label="Alergias">
                  <textarea name="allergies" className={textareaClassName} />
                </Field>
                <Field label="Tratamientos previos">
                  <textarea name="previousTreatments" className={textareaClassName} />
                </Field>
                <Field label="Notas importantes">
                  <textarea name="importantNotes" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    {patientCount} pacientes registrados actualmente.
                  </p>
                  <SubmitButton label="Guardar paciente" pendingLabel="Guardando paciente..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentPatients.length === 0 ? (
                  <EmptyState>Aun no hay pacientes registrados.</EmptyState>
                ) : (
                  recentPatients.map((patient) => (
                    <details
                      key={patient.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <p className="font-semibold text-(--color-ink)">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {patient.identification} · {patient.phone}
                        </p>
                        <p className="mt-2 text-sm text-(--color-muted)">
                          Proximo control: {formatDate(patient.nextVisitAt)}
                        </p>
                      </summary>
                      <form action={updatePatient} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={patient.id} />
                        <div className={formGridClassName}>
                          <Field label="Nombres">
                            <input name="firstName" defaultValue={patient.firstName} className={inputClassName} required />
                          </Field>
                          <Field label="Apellidos">
                            <input name="lastName" defaultValue={patient.lastName} className={inputClassName} required />
                          </Field>
                          <Field label="Identificacion">
                            <input name="identification" defaultValue={patient.identification} className={inputClassName} required />
                          </Field>
                          <Field label="Telefono">
                            <input name="phone" defaultValue={patient.phone} className={inputClassName} required />
                          </Field>
                          <Field label="Correo">
                            <input name="email" type="email" defaultValue={patient.email ?? ""} className={inputClassName} />
                          </Field>
                          <Field label="Nacimiento">
                            <input name="birthDate" type="date" defaultValue={formatDateInput(patient.birthDate)} className={inputClassName} />
                          </Field>
                          <Field label="Ultima visita">
                            <input name="lastVisitAt" type="date" defaultValue={formatDateInput(patient.lastVisitAt)} className={inputClassName} />
                          </Field>
                          <Field label="Proximo control">
                            <input name="nextVisitAt" type="date" defaultValue={formatDateInput(patient.nextVisitAt)} className={inputClassName} />
                          </Field>
                        </div>
                        <Field label="Alergias">
                          <textarea name="allergies" defaultValue={patient.allergies ?? ""} className={textareaClassName} />
                        </Field>
                        <Field label="Tratamientos previos">
                          <textarea name="previousTreatments" defaultValue={patient.previousTreatments ?? ""} className={textareaClassName} />
                        </Field>
                        <Field label="Notas">
                          <textarea name="importantNotes" defaultValue={patient.importantNotes ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={patient.id} deleteAction={deletePatient} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="proveedores"
              eyebrow="Base comercial"
              title="Proveedores"
              description="Registra laboratorios o distribuidores para relacionarlos con productos."
            >
              <form action={createSupplier} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Empresa">
                    <input name="companyName" className={inputClassName} required />
                  </Field>
                  <Field label="Asesor comercial">
                    <input name="commercialAdvisor" className={inputClassName} />
                  </Field>
                  <Field label="Telefono">
                    <input name="phone" className={inputClassName} />
                  </Field>
                  <Field label="Correo">
                    <input name="email" type="email" className={inputClassName} />
                  </Field>
                </div>
                <Field label="Notas">
                  <textarea name="notes" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    {supplierCount} proveedores activos en base.
                  </p>
                  <SubmitButton label="Guardar proveedor" pendingLabel="Guardando proveedor..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentSuppliers.length === 0 ? (
                  <EmptyState>Aun no hay proveedores registrados.</EmptyState>
                ) : (
                  recentSuppliers.map((supplier) => (
                    <details
                      key={supplier.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <p className="font-semibold text-(--color-ink)">{supplier.companyName}</p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {supplier.commercialAdvisor ?? "Sin asesor"} · {supplier.phone ?? "Sin telefono"}
                        </p>
                      </summary>
                      <form action={updateSupplier} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={supplier.id} />
                        <div className={formGridClassName}>
                          <Field label="Empresa">
                            <input name="companyName" defaultValue={supplier.companyName} className={inputClassName} required />
                          </Field>
                          <Field label="Asesor">
                            <input name="commercialAdvisor" defaultValue={supplier.commercialAdvisor ?? ""} className={inputClassName} />
                          </Field>
                          <Field label="Telefono">
                            <input name="phone" defaultValue={supplier.phone ?? ""} className={inputClassName} />
                          </Field>
                          <Field label="Correo">
                            <input name="email" type="email" defaultValue={supplier.email ?? ""} className={inputClassName} />
                          </Field>
                        </div>
                        <Field label="Notas">
                          <textarea name="notes" defaultValue={supplier.notes ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={supplier.id} deleteAction={deleteSupplier} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="productos"
              eyebrow="Catalogo"
              title="Productos e insumos"
              description="Guarda stock, lote, vencimiento y proveedor del producto."
            >
              <form action={createProduct} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Nombre">
                    <input name="name" className={inputClassName} required />
                  </Field>
                  <Field label="SKU">
                    <input name="sku" className={inputClassName} />
                  </Field>
                  <Field label="Lote">
                    <input name="lotNumber" className={inputClassName} required />
                  </Field>
                  <Field label="Stock actual">
                    <input
                      name="stockQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Stock minimo">
                    <input
                      name="minStockQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Unidad">
                    <select name="unit" className={inputClassName} defaultValue="UNIT" required>
                      {Object.values(InventoryUnit).map((unit) => (
                        <option key={unit} value={unit}>
                          {inventoryUnitLabels[unit]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vencimiento">
                    <input name="expiresAt" type="date" className={inputClassName} />
                  </Field>
                </div>
                <Field label="Proveedor">
                  <select name="supplierId" className={inputClassName} required>
                    <option value="">Selecciona un proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.companyName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Descripcion">
                  <textarea name="description" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    {productCount} productos guardados.
                  </p>
                  <SubmitButton label="Guardar producto" pendingLabel="Guardando producto..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentProducts.length === 0 ? (
                  <EmptyState>Crea primero un proveedor y luego carga productos.</EmptyState>
                ) : (
                  recentProducts.map((product) => (
                    <details
                      key={product.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-(--color-ink)">{product.name}</p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              {product.supplier.companyName} · {product.lotNumber}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-(--color-muted)">
                          Stock: {toNumber(product.stockQuantity)} / Minimo: {toNumber(product.minStockQuantity)}
                        </p>
                      </summary>
                      <form action={updateProduct} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={product.id} />
                        <div className={formGridClassName}>
                          <Field label="Nombre">
                            <input name="name" defaultValue={product.name} className={inputClassName} required />
                          </Field>
                          <Field label="SKU">
                            <input name="sku" defaultValue={product.sku ?? ""} className={inputClassName} />
                          </Field>
                          <Field label="Lote">
                            <input name="lotNumber" defaultValue={product.lotNumber} className={inputClassName} required />
                          </Field>
                          <Field label="Stock actual">
                            <input name="stockQuantity" type="number" step="0.01" min="0" defaultValue={toNumber(product.stockQuantity)} className={inputClassName} required />
                          </Field>
                          <Field label="Stock minimo">
                            <input name="minStockQuantity" type="number" step="0.01" min="0" defaultValue={toNumber(product.minStockQuantity)} className={inputClassName} required />
                          </Field>
                          <Field label="Unidad">
                            <select name="unit" defaultValue={product.unit} className={inputClassName} required>
                              {Object.values(InventoryUnit).map((unit) => (
                                <option key={unit} value={unit}>{inventoryUnitLabels[unit]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Vencimiento">
                            <input name="expiresAt" type="date" defaultValue={formatDateInput(product.expiresAt)} className={inputClassName} />
                          </Field>
                          <Field label="Activo">
                            <select name="isActive" defaultValue={String(product.isActive)} className={inputClassName}>
                              <option value="true">Si</option>
                              <option value="false">No</option>
                            </select>
                          </Field>
                        </div>
                        <Field label="Proveedor">
                          <select name="supplierId" defaultValue={product.supplierId} className={inputClassName} required>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Descripcion">
                          <textarea name="description" defaultValue={product.description ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={product.id} deleteAction={deleteProduct} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="precios"
              eyebrow="Precios"
              title="Items de venta"
              description="Define tratamientos y productos que podras facturar en ingresos."
            >
              <form action={createSaleItem} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Nombre">
                    <input name="name" className={inputClassName} required />
                  </Field>
                  <Field label="Tipo">
                    <select name="type" className={inputClassName} defaultValue="TREATMENT" required>
                      {Object.values(SaleItemType).map((type) => (
                        <option key={type} value={type}>
                          {saleItemTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Precio de venta">
                    <input
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field
                    label="Producto relacionado"
                    hint="Obligatorio si el item es de tipo producto."
                  >
                    <select name="productId" className={inputClassName} defaultValue="">
                      <option value="">Sin producto relacionado</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                          {product.sku ? ` · ${product.sku}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Descripcion">
                  <textarea name="description" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    {saleItemCount} precios listos para facturar.
                  </p>
                  <SubmitButton label="Guardar item" pendingLabel="Guardando item..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentSaleItems.length === 0 ? (
                  <EmptyState>Aun no hay items de venta registrados.</EmptyState>
                ) : (
                  recentSaleItems.map((item) => (
                    <details
                      key={item.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-(--color-ink)">{item.name}</p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              {saleItemTypeLabels[item.type]}
                              {item.product ? ` · ${item.product.name}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-(--color-ink)">
                            {formatMoney(item.unitPrice)}
                          </p>
                        </div>
                      </summary>
                      <form action={updateSaleItem} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={item.id} />
                        <div className={formGridClassName}>
                          <Field label="Nombre">
                            <input name="name" defaultValue={item.name} className={inputClassName} required />
                          </Field>
                          <Field label="Tipo">
                            <select name="type" defaultValue={item.type} className={inputClassName} required>
                              {Object.values(SaleItemType).map((type) => (
                                <option key={type} value={type}>{saleItemTypeLabels[type]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Precio">
                            <input name="unitPrice" type="number" step="0.01" min="0" defaultValue={toNumber(item.unitPrice)} className={inputClassName} required />
                          </Field>
                          <Field label="Producto relacionado">
                            <select name="productId" defaultValue={item.productId ?? ""} className={inputClassName}>
                              <option value="">Sin producto relacionado</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}{product.sku ? ` · ${product.sku}` : ""}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Descripcion">
                          <textarea name="description" defaultValue={item.description ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={item.id} deleteAction={deleteSaleItem} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="ingresos"
              eyebrow="Caja"
              title="Ingresos"
              description="Registra el ingreso asociando paciente, item vendido y medio de pago."
            >
              <form action={createRevenue} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Fecha y hora">
                    <input name="occurredAt" type="datetime-local" className={inputClassName} />
                  </Field>
                  <Field label="Monto">
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Paciente">
                    <select name="patientId" className={inputClassName} required>
                      <option value="">Selecciona un paciente</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.lastName}, {patient.firstName} · {patient.identification}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Item vendido">
                    <select name="saleItemId" className={inputClassName} required>
                      <option value="">Selecciona un item</option>
                      {saleItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {formatMoney(item.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Medio de pago">
                    <select
                      name="paymentMethod"
                      className={inputClassName}
                      defaultValue="TRANSFER"
                      required
                    >
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabels[method]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Notas">
                  <textarea name="notes" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    Cada ingreso actualiza el resumen mensual del dashboard.
                  </p>
                  <SubmitButton label="Registrar ingreso" pendingLabel="Guardando ingreso..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentRevenues.length === 0 ? (
                  <EmptyState>Necesitas pacientes e items de venta antes de registrar ingresos.</EmptyState>
                ) : (
                  recentRevenues.map((revenue) => (
                    <details
                      key={revenue.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
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
                          {formatDateTime(revenue.occurredAt)}
                        </p>
                      </summary>
                      <form action={updateRevenue} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={revenue.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora">
                            <input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(revenue.occurredAt)} className={inputClassName} />
                          </Field>
                          <Field label="Monto">
                            <input name="amount" type="number" step="0.01" min="0" defaultValue={toNumber(revenue.amount)} className={inputClassName} required />
                          </Field>
                          <Field label="Paciente">
                            <select name="patientId" defaultValue={revenue.patientId} className={inputClassName} required>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.lastName}, {patient.firstName} · {patient.identification}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Item vendido">
                            <select name="saleItemId" defaultValue={revenue.saleItemId} className={inputClassName} required>
                              {saleItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} · {formatMoney(item.unitPrice)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Medio de pago">
                            <select name="paymentMethod" defaultValue={revenue.paymentMethod} className={inputClassName} required>
                              {Object.values(PaymentMethod).map((method) => (
                                <option key={method} value={method}>{paymentMethodLabels[method]}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Notas">
                          <textarea name="notes" defaultValue={revenue.notes ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={revenue.id} deleteAction={deleteRevenue} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="egresos"
              eyebrow="Caja"
              title="Egresos"
              description="Registra gastos operativos, compras, software, impuestos y otros costos."
            >
              <form action={createExpense} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Fecha y hora">
                    <input name="occurredAt" type="datetime-local" className={inputClassName} />
                  </Field>
                  <Field label="Monto">
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Categoria">
                    <select name="category" className={inputClassName} defaultValue="SUPPLIES" required>
                      {Object.values(ExpenseCategory).map((category) => (
                        <option key={category} value={category}>
                          {expenseCategoryLabels[category]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Descripcion">
                    <input name="description" className={inputClassName} required />
                  </Field>
                </div>
                <Field label="Notas">
                  <textarea name="notes" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    Usa descripciones claras para distinguir gastos fijos y compras.
                  </p>
                  <SubmitButton label="Registrar egreso" pendingLabel="Guardando egreso..." />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentExpenses.length === 0 ? (
                  <EmptyState>Aun no hay egresos registrados.</EmptyState>
                ) : (
                  recentExpenses.map((expense) => (
                    <details
                      key={expense.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
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
                          {formatDateTime(expense.occurredAt)}
                        </p>
                      </summary>
                      <form action={updateExpense} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={expense.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora">
                            <input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(expense.occurredAt)} className={inputClassName} />
                          </Field>
                          <Field label="Monto">
                            <input name="amount" type="number" step="0.01" min="0" defaultValue={toNumber(expense.amount)} className={inputClassName} required />
                          </Field>
                          <Field label="Categoria">
                            <select name="category" defaultValue={expense.category} className={inputClassName} required>
                              {Object.values(ExpenseCategory).map((category) => (
                                <option key={category} value={category}>{expenseCategoryLabels[category]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Descripcion">
                            <input name="description" defaultValue={expense.description} className={inputClassName} required />
                          </Field>
                        </div>
                        <Field label="Notas">
                          <textarea name="notes" defaultValue={expense.notes ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={expense.id} deleteAction={deleteExpense} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>

            <FormCard
              id="inventario"
              eyebrow="Inventario"
              title="Movimientos"
              description="Registra compras, ventas, ajustes, mermas y vencimientos de cada producto."
            >
              <form action={createInventoryMovement} className="grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Fecha y hora">
                    <input name="occurredAt" type="datetime-local" className={inputClassName} />
                  </Field>
                  <Field label="Tipo">
                    <select name="type" className={inputClassName} defaultValue="PURCHASE" required>
                      {Object.values(InventoryMovementType).map((type) => (
                        <option key={type} value={type}>
                          {inventoryMovementLabels[type]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Producto">
                    <select name="productId" className={inputClassName} required>
                      <option value="">Selecciona un producto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                          {product.sku ? ` · ${product.sku}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cantidad">
                    <input
                      name="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClassName}
                      required
                    />
                  </Field>
                </div>
                <Field label="Motivo o detalle">
                  <textarea name="reason" className={textareaClassName} />
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-(--color-muted)">
                    Registra una linea por cada salida o entrada relevante.
                  </p>
                  <SubmitButton
                    label="Registrar movimiento"
                    pendingLabel="Guardando movimiento..."
                  />
                </div>
              </form>

              <div className="mt-6 grid gap-3">
                {recentMovements.length === 0 ? (
                  <EmptyState>Aun no hay movimientos de inventario registrados.</EmptyState>
                ) : (
                  recentMovements.map((movement) => (
                    <details
                      key={movement.id}
                      className="rounded-3xl border border-(--color-line) bg-white px-4 py-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-(--color-ink)">
                              {movement.product.name}
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              {inventoryMovementLabels[movement.type]}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-(--color-ink)">
                            {toNumber(movement.quantity)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-(--color-muted)">
                          {formatDateTime(movement.occurredAt)}
                        </p>
                      </summary>
                      <form action={updateInventoryMovement} className="mt-4 grid gap-3 border-t border-(--color-line) pt-4">
                        <input type="hidden" name="id" value={movement.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora">
                            <input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(movement.occurredAt)} className={inputClassName} />
                          </Field>
                          <Field label="Tipo">
                            <select name="type" defaultValue={movement.type} className={inputClassName} required>
                              {Object.values(InventoryMovementType).map((type) => (
                                <option key={type} value={type}>{inventoryMovementLabels[type]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Producto">
                            <select name="productId" defaultValue={movement.productId} className={inputClassName} required>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}{product.sku ? ` · ${product.sku}` : ""}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Cantidad">
                            <input name="quantity" type="number" step="0.01" min="0" defaultValue={toNumber(movement.quantity)} className={inputClassName} required />
                          </Field>
                        </div>
                        <Field label="Motivo o detalle">
                          <textarea name="reason" defaultValue={movement.reason ?? ""} className={textareaClassName} />
                        </Field>
                        <RecordActions id={movement.id} deleteAction={deleteInventoryMovement} />
                      </form>
                    </details>
                  ))
                )}
              </div>
            </FormCard>
          </div>
        </section>
      </section>
    </main>
  );
}
