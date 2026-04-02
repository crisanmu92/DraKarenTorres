import Link from "next/link";

import { EmptyState, Field, FilterTabs, FormCard, SectionHeading, inputClassName, sectionCardClassName } from "@/components/clinic/ui";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatDate, formatDateInput, formatMoney, formatPercent, getNetAmount, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FinancePeriod = "today" | "week" | "month" | "custom";

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function getDateKey(value: Date) {
  return formatDateInput(value);
}

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getFinancePeriod(period?: string): FinancePeriod {
  if (period === "week" || period === "month" || period === "custom") {
    return period;
  }

  return "today";
}

function getDateRange(period: FinancePeriod, from?: string, to?: string) {
  const now = new Date();

  if (period === "custom") {
    const parsedFrom = parseDateValue(from);
    const parsedTo = parseDateValue(to);

    if (parsedFrom && parsedTo) {
      const rangeStart = startOfDay(parsedFrom);
      const rangeEnd = addDays(startOfDay(parsedTo), 1);

      if (rangeStart < rangeEnd) {
        return { rangeStart, rangeEnd };
      }
    }
  }

  if (period === "month") {
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { rangeStart, rangeEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }

  if (period === "week") {
    const rangeStart = startOfWeek(now);
    return { rangeStart, rangeEnd: addDays(rangeStart, 7) };
  }

  const rangeStart = startOfDay(now);
  return { rangeStart, rangeEnd: addDays(rangeStart, 1) };
}

function buildFinancePath(period: FinancePeriod, from?: string, to?: string) {
  const params = new URLSearchParams();

  if (period !== "today") {
    params.set("period", period);
  }

  if (period === "custom") {
    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }
  }

  const query = params.toString();
  return query ? `/movimientos?${query}` : "/movimientos";
}

type RevenueRow = {
  id: string;
  occurredAt: Date;
  amount: unknown;
  discountAmount: unknown;
  costAmount: unknown;
  patient: { firstName: string; lastName: string };
  saleItem: { name: string };
};

type ExpenseRow = {
  id: string;
  occurredAt: Date;
  amount: unknown;
  description: string;
};

type ReceivablePaymentRow = {
  id: string;
  paidAt: Date;
  amount: unknown;
  accountReceivable: {
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
  };
};

type PayableRow = {
  id: string;
  creditorName: string;
  description: string;
  amount: unknown;
  debtDate: Date;
  nextPaymentDate: Date | null;
  paidAt: Date | null;
  supplier: { companyName: string } | null;
};

type PendingReceivableRow = {
  id: string;
  serviceDate: Date;
  totalAmount: unknown;
  nextDueDate: Date | null;
  patient: { firstName: string; lastName: string };
  saleItem: { name: string };
  payments: Array<{ amount: unknown }>;
};

type PendingPayableRow = {
  id: string;
  creditorName: string;
  description: string;
  amount: unknown;
  nextPaymentDate: Date | null;
  supplier: { companyName: string } | null;
};

type ActivityItem = {
  id: string;
  date: Date;
  label: string;
  detail: string;
  amount: number;
  direction: "in" | "out";
  tone: string;
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedPeriod = getFinancePeriod(resolvedSearchParams?.period);
  const { rangeStart, rangeEnd } = getDateRange(
    selectedPeriod,
    resolvedSearchParams?.from,
    resolvedSearchParams?.to,
  );
  const fromValue = getDateKey(rangeStart);
  const toValue = getDateKey(addDays(rangeEnd, -1));

  let revenues: RevenueRow[] = [];
  let expenses: ExpenseRow[] = [];
  let receivablePayments: ReceivablePaymentRow[] = [];
  let periodPayables: PayableRow[] = [];
  let pendingReceivables: PendingReceivableRow[] = [];
  let pendingPayables: PendingPayableRow[] = [];
  let pageError: string | null = null;

  try {
    [
      revenues,
      expenses,
      receivablePayments,
      periodPayables,
      pendingReceivables,
      pendingPayables,
    ] = await Promise.all([
      prisma.revenue.findMany({
        where: { occurredAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: [{ occurredAt: "desc" }],
        include: {
          patient: { select: { firstName: true, lastName: true } },
          saleItem: { select: { name: true } },
        },
      }),
      prisma.expense.findMany({
        where: { occurredAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: [{ occurredAt: "desc" }],
        select: {
          id: true,
          occurredAt: true,
          amount: true,
          description: true,
        },
      }),
      prisma.accountReceivablePayment.findMany({
        where: { paidAt: { gte: rangeStart, lt: rangeEnd } },
        orderBy: [{ paidAt: "desc" }],
        include: {
          accountReceivable: {
            select: {
              patient: { select: { firstName: true, lastName: true } },
              saleItem: { select: { name: true } },
            },
          },
        },
      }),
      prisma.accountPayable.findMany({
        where: {
          OR: [
            { debtDate: { gte: rangeStart, lt: rangeEnd } },
            { paidAt: { gte: rangeStart, lt: rangeEnd } },
          ],
        },
        orderBy: [{ debtDate: "desc" }],
        include: {
          supplier: { select: { companyName: true } },
        },
      }),
      prisma.accountReceivable.findMany({
        where: { isCompleted: false },
        orderBy: [{ nextDueDate: "asc" }, { serviceDate: "desc" }],
        take: 6,
        include: {
          patient: { select: { firstName: true, lastName: true } },
          saleItem: { select: { name: true } },
          payments: { select: { amount: true } },
        },
      }),
      prisma.accountPayable.findMany({
        where: { isCompleted: false },
        orderBy: [{ nextPaymentDate: "asc" }, { createdAt: "desc" }],
        take: 6,
        include: {
          supplier: { select: { companyName: true } },
        },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la vista de finanzas.";
  }

  const serviceSalesTotal = revenues.reduce(
    (sum, revenue) => sum + getNetAmount(revenue.amount, revenue.discountAmount),
    0,
  );
  const serviceCostsTotal = revenues.reduce((sum, revenue) => sum + toNumber(revenue.costAmount), 0);
  const serviceProfitTotal = serviceSalesTotal - serviceCostsTotal;
  const operatingExpenseTotal = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const receivableCollectionsTotal = receivablePayments.reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  const supplierPurchasesTotal = periodPayables
    .filter((item) => item.supplier && item.debtDate >= rangeStart && item.debtDate < rangeEnd)
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const payablePaymentsTotal = periodPayables
    .filter((item) => item.paidAt && item.paidAt >= rangeStart && item.paidAt < rangeEnd)
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const pendingReceivablesTotal = pendingReceivables.reduce((sum, item) => {
    const paid = item.payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
    return sum + Math.max(0, toNumber(item.totalAmount) - paid);
  }, 0);
  const pendingPayablesTotal = pendingPayables.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const netCashflow = serviceSalesTotal + receivableCollectionsTotal - operatingExpenseTotal - payablePaymentsTotal;
  const serviceMargin = serviceSalesTotal > 0 ? (serviceProfitTotal / serviceSalesTotal) * 100 : 0;

  const filterOptions = [
    { href: buildFinancePath("today"), label: "Hoy", active: selectedPeriod === "today" },
    { href: buildFinancePath("week"), label: "Semana", active: selectedPeriod === "week" },
    { href: buildFinancePath("month"), label: "Mes", active: selectedPeriod === "month" },
  ];

  const activityItems: ActivityItem[] = [
    ...revenues.map((revenue) => ({
      id: `revenue-${revenue.id}`,
      date: revenue.occurredAt,
      label: "Servicio vendido",
      detail: `${revenue.patient.firstName} ${revenue.patient.lastName} · ${revenue.saleItem.name}`,
      amount: getNetAmount(revenue.amount, revenue.discountAmount),
      direction: "in" as const,
      tone: "bg-[#eefbf3] text-[#166534]",
    })),
    ...receivablePayments.map((payment) => ({
      id: `receivable-payment-${payment.id}`,
      date: payment.paidAt,
      label: "Cobro de cartera",
      detail: `${payment.accountReceivable.patient.firstName} ${payment.accountReceivable.patient.lastName} · ${payment.accountReceivable.saleItem.name}`,
      amount: toNumber(payment.amount),
      direction: "in" as const,
      tone: "bg-[#edf4ff] text-[#1d4ed8]",
    })),
    ...expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.occurredAt,
      label: "Egreso",
      detail: expense.description,
      amount: toNumber(expense.amount),
      direction: "out" as const,
      tone: "bg-[#fff3f1] text-[#b42318]",
    })),
    ...periodPayables
      .filter((item) => item.supplier && item.debtDate >= rangeStart && item.debtDate < rangeEnd)
      .map((item) => ({
        id: `payable-debt-${item.id}`,
        date: item.debtDate,
        label: "Compra a proveedor",
        detail: `${item.supplier?.companyName ?? item.creditorName} · ${item.description}`,
        amount: toNumber(item.amount),
        direction: "out" as const,
        tone: "bg-[#fff7ed] text-[#b45309]",
      })),
    ...periodPayables
      .filter((item) => item.paidAt && item.paidAt >= rangeStart && item.paidAt < rangeEnd)
      .map((item) => ({
        id: `payable-payment-${item.id}`,
        date: item.paidAt as Date,
        label: "Pago realizado",
        detail: `${item.supplier?.companyName ?? item.creditorName} · ${item.description}`,
        amount: toNumber(item.amount),
        direction: "out" as const,
        tone: "bg-[#fef2f2] text-[#991b1b]",
      })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const dailyMap = new Map<string, {
    date: Date;
    serviceSales: number;
    receivableCollections: number;
    expenses: number;
    supplierPurchases: number;
    payablePayments: number;
    serviceProfit: number;
  }>();

  for (let current = new Date(rangeStart); current < rangeEnd; current = addDays(current, 1)) {
    dailyMap.set(getDateKey(current), {
      date: new Date(current),
      serviceSales: 0,
      receivableCollections: 0,
      expenses: 0,
      supplierPurchases: 0,
      payablePayments: 0,
      serviceProfit: 0,
    });
  }

  for (const revenue of revenues) {
    const entry = dailyMap.get(getDateKey(revenue.occurredAt));

    if (entry) {
      entry.serviceSales += getNetAmount(revenue.amount, revenue.discountAmount);
      entry.serviceProfit += getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount);
    }
  }

  for (const payment of receivablePayments) {
    const entry = dailyMap.get(getDateKey(payment.paidAt));

    if (entry) {
      entry.receivableCollections += toNumber(payment.amount);
    }
  }

  for (const expense of expenses) {
    const entry = dailyMap.get(getDateKey(expense.occurredAt));

    if (entry) {
      entry.expenses += toNumber(expense.amount);
    }
  }

  for (const item of periodPayables) {
    if (item.supplier) {
      const debtEntry = dailyMap.get(getDateKey(item.debtDate));

      if (debtEntry) {
        debtEntry.supplierPurchases += toNumber(item.amount);
      }
    }

    if (item.paidAt) {
      const paymentEntry = dailyMap.get(getDateKey(item.paidAt));

      if (paymentEntry) {
        paymentEntry.payablePayments += toNumber(item.amount);
      }
    }
  }

  const dailySummaries = Array.from(dailyMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <SectionHeading
        eyebrow="Finanzas"
        title="Finanzas"
        description="Aqui puedes revisar tu actividad diaria, semanal o mensual, ver cobros, pagos, compras, ventas y entender con claridad cuanto te esta quedando de utilidad."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <article className={sectionCardClassName}>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
                  Vista rapida
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-(--color-ink)">
                  Flujo financiero del periodo
                </h2>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Desde {formatDate(rangeStart)} hasta {formatDate(addDays(rangeEnd, -1))}.
                </p>
              </div>
              <FilterTabs options={filterOptions} />
            </div>

            <form className="grid gap-3 rounded-3xl border border-(--color-line) bg-[#f8fbff] p-4 md:grid-cols-[0.9fr_1fr_1fr_auto] md:items-end">
              <Field label="Periodo">
                <select name="period" defaultValue={selectedPeriod} className={inputClassName}>
                  <option value="today">Hoy</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="custom">Rango personalizado</option>
                </select>
              </Field>
              <Field label="Desde">
                <input name="from" type="date" defaultValue={fromValue} className={inputClassName} />
              </Field>
              <Field label="Hasta">
                <input name="to" type="date" defaultValue={toValue} className={inputClassName} />
              </Field>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#111827] px-5 text-sm font-semibold text-white"
              >
                Filtrar
              </button>
            </form>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-[#dbe4ee] bg-[#0f172a] p-5 text-white shadow-(--shadow-card)">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Flujo neto del periodo
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight">
                {formatMoney(netCashflow)}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Entradas por servicios y cartera menos egresos y pagos realizados.
              </p>
            </div>
            <div className="rounded-[24px] border border-[#dbe4ee] bg-white p-5 shadow-(--shadow-card)">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
                Utilidad de servicios
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-(--color-ink)">
                {formatMoney(serviceProfitTotal)}
              </p>
              <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                Margen del periodo: {formatPercent(serviceMargin)}.
              </p>
            </div>
          </div>
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Servicios vendidos"
          value={formatMoney(serviceSalesTotal)}
          helper={`${revenues.length} ventas registradas en el periodo.`}
          tone="positive"
        />
        <MetricCard
          label="Cobros por cobrar"
          value={formatMoney(receivableCollectionsTotal)}
          helper={`${receivablePayments.length} abonos o cobros recibidos.`}
          tone="positive"
        />
        <MetricCard
          label="Egresos"
          value={formatMoney(operatingExpenseTotal + payablePaymentsTotal)}
          helper={`${expenses.length} egresos y ${periodPayables.filter((item) => item.paidAt).length} pagos realizados.`}
          tone="negative"
        />
        <MetricCard
          label="Compras proveedor"
          value={formatMoney(supplierPurchasesTotal)}
          helper={`${periodPayables.filter((item) => item.supplier && item.debtDate >= rangeStart && item.debtDate < rangeEnd).length} compras registradas por pagar.`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <FormCard
          eyebrow="Pendientes"
          title="Cuentas por cobrar activas"
          description="Pacientes con saldo pendiente para que sepas que debes cobrar primero."
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-(--color-ink)">
              Total pendiente: {formatMoney(pendingReceivablesTotal)}
            </p>
            <Link href="/cuentas-por-cobrar" className="text-sm font-semibold text-[#2f5be7]">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-3">
            {pendingReceivables.length === 0 ? (
              <EmptyState>No tienes cuentas por cobrar activas en este momento.</EmptyState>
            ) : (
              pendingReceivables.map((item) => {
                const paid = item.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
                const balance = Math.max(0, toNumber(item.totalAmount) - paid);

                return (
                  <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-(--color-ink)">
                          {item.patient.firstName} {item.patient.lastName}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">{item.saleItem.name}</p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          Servicio: {formatDate(item.serviceDate)} · Proximo cobro: {formatDate(item.nextDueDate)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#b45309]">{formatMoney(balance)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </FormCard>

        <FormCard
          eyebrow="Pendientes"
          title="Cuentas por pagar activas"
          description="Pagos pendientes con proveedores u otros acreedores para que no se te pase nada."
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-(--color-ink)">
              Total pendiente: {formatMoney(pendingPayablesTotal)}
            </p>
            <Link href="/cuentas-por-pagar" className="text-sm font-semibold text-[#2f5be7]">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-3">
            {pendingPayables.length === 0 ? (
              <EmptyState>No tienes cuentas por pagar activas en este momento.</EmptyState>
            ) : (
              pendingPayables.map((item) => (
                <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">
                        {item.supplier?.companyName ?? item.creditorName}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">{item.description}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        Proximo pago: {formatDate(item.nextPaymentDate)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#b91c1c]">{formatMoney(item.amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Resumen"
            title="Movimiento por dia"
            description="Cada fila resume ventas, cobros, egresos, compras y utilidad del dia dentro del rango elegido."
          />
          <div className="mt-6 grid gap-3">
            {dailySummaries.length === 0 ? (
              <EmptyState>No hay dias disponibles en el rango seleccionado.</EmptyState>
            ) : (
              dailySummaries.map((day) => (
                <div key={getDateKey(day.date)} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{formatDate(day.date)}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        Ventas {formatMoney(day.serviceSales)} · Cartera {formatMoney(day.receivableCollections)}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        Egresos {formatMoney(day.expenses)} · Pagos {formatMoney(day.payablePayments)} · Compras {formatMoney(day.supplierPurchases)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">
                        Utilidad servicios
                      </p>
                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                        {formatMoney(day.serviceProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={sectionCardClassName}>
          <SectionHeading
            eyebrow="Detalle"
            title="Actividad del periodo"
            description="Linea de tiempo con lo mas importante que paso en tu caja y en tus cuentas."
          />
          <div className="mt-6 grid gap-3">
            {activityItems.length === 0 ? (
              <EmptyState>No hay actividad registrada en este periodo.</EmptyState>
            ) : (
              activityItems.slice(0, 24).map((item) => (
                <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}>
                        {item.label}
                      </span>
                      <p className="mt-3 font-semibold text-(--color-ink)">{item.detail}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{formatDate(item.date)}</p>
                    </div>
                    <p className={`text-sm font-semibold ${item.direction === "in" ? "text-[#166534]" : "text-[#b42318]"}`}>
                      {item.direction === "in" ? "+" : "-"}{formatMoney(item.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <article className={sectionCardClassName}>
        <SectionHeading
          eyebrow="Acciones"
          title="Atajos recomendados"
          description="Desde aqui puedes registrar lo nuevo y luego volver a esta vista para seguir el resultado."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Link href="/ingresos" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Registrar ingreso
          </Link>
          <Link href="/egresos" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Registrar egreso
          </Link>
          <Link href="/cuentas-por-cobrar" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Revisar cuentas por cobrar
          </Link>
          <Link href="/cuentas-por-pagar" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Revisar cuentas por pagar
          </Link>
          <Link href="/rentabilidad" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Ver rentabilidad
          </Link>
        </div>
      </article>
    </>
  );
}
