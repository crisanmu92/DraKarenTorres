import { EmptyState, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import { MetricCard } from "@/components/dashboard/metric-card";
import { formatDate, formatMoney, getNetAmount, monthFormatter, toNumber } from "@/lib/clinic-format";
import { getMonthRange } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedMonth = resolvedSearchParams?.month ?? null;
  const { monthStart, nextMonthStart } = getMonthRange(selectedMonth);
  const currentMonthValue = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  let revenues: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    discountAmount: unknown;
    costAmount: unknown;
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
  }> = [];
  let pageError: string | null = null;

  try {
    revenues = await prisma.revenue.findMany({
      where: { occurredAt: { gte: monthStart, lt: nextMonthStart } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        saleItem: { select: { name: true } },
      },
      orderBy: [{ occurredAt: "desc" }],
      take: 40,
    });
  } catch {
    pageError = "No se pudo cargar la rentabilidad en este momento.";
  }

  const incomeTotal = revenues.reduce(
    (sum, revenue) => sum + getNetAmount(revenue.amount, revenue.discountAmount),
    0,
  );
  const costTotal = revenues.reduce((sum, revenue) => sum + toNumber(revenue.costAmount), 0);
  const profitTotal = incomeTotal - costTotal;
  const margin = incomeTotal > 0 ? (profitTotal / incomeTotal) * 100 : 0;
  const monthLabel = monthFormatter.format(monthStart);

  return (
    <>
      <SectionHeading
        eyebrow="Rentabilidad"
        title="Paciente, servicio, costo y ganancia"
        description="Aqui ves por cada ingreso cuanto cobraste, cuanto te costo y cuanto gano realmente el servicio."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

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
                defaultValue={currentMonthValue}
                className="w-full rounded-2xl border border-(--color-line) bg-[#fffdfa] px-4 py-3 text-sm text-(--color-ink) outline-none transition focus:border-[#171311]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[#181311] px-5 py-3 text-sm font-semibold text-[#fffdf9]"
            >
              Ver rentabilidad
            </button>
          </form>
        </div>
      </article>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos" value={formatMoney(incomeTotal)} helper={`${revenues.length} servicios cobrados en el periodo.`} tone="positive" />
        <MetricCard label="Costos directos" value={formatMoney(costTotal)} helper="Suma de costos asignados a cada servicio cobrado." tone="negative" />
        <MetricCard label="Ganancia" value={formatMoney(profitTotal)} helper={`Margen bruto del periodo: ${margin.toFixed(1)}%.`} />
        <MetricCard label="Ganancia promedio" value={formatMoney(revenues.length > 0 ? profitTotal / revenues.length : 0)} helper="Ganancia promedio por ingreso registrado." />
      </section>

      <article className={sectionCardClassName}>
        <SectionHeading
          eyebrow="Detalle"
          title="Rentabilidad por ingreso"
          description="Cada fila te muestra paciente, servicio, cobro, costo y ganancia para revisar que tan rentable fue."
        />

        <div className="mt-6 grid gap-3">
          {revenues.length === 0 ? (
            <EmptyState>No hay ingresos en este periodo para calcular rentabilidad.</EmptyState>
          ) : (
            revenues.map((revenue) => {
              const amount = getNetAmount(revenue.amount, revenue.discountAmount);
              const cost = toNumber(revenue.costAmount);
              const profit = amount - cost;

              return (
                <div key={revenue.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr_0.8fr] md:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Paciente</p>
                      <p className="mt-1 font-semibold text-(--color-ink)">{revenue.patient.firstName} {revenue.patient.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Servicio</p>
                      <p className="mt-1 font-semibold text-(--color-ink)">{revenue.saleItem.name}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{formatDate(revenue.occurredAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Cobrado</p>
                      <p className="mt-1 font-semibold text-[#166534]">{formatMoney(amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Costo</p>
                      <p className="mt-1 font-semibold text-[#b45309]">{formatMoney(cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Ganancia</p>
                      <p className="mt-1 font-semibold text-(--color-ink)">{formatMoney(profit)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>
    </>
  );
}
