import { MetricCard } from "@/components/dashboard/metric-card";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { getDashboardSummary } from "@/lib/dashboard";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

export default async function Home() {
  const summary = await getDashboardSummary();
  const currentMonthLabel = monthFormatter.format(new Date());

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top,rgba(199,182,145,0.3),transparent_48%),linear-gradient(180deg,rgba(248,244,238,0.96),rgba(244,239,232,0.82))]" />

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="grid gap-6 rounded-[36px] border border-white/70 bg-white/72 p-7 shadow-(--shadow-card) backdrop-blur md:grid-cols-[1.5fr_0.9fr] lg:p-10">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-(--color-muted)">
              Consultorio de Medicina Estetica
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-5xl leading-none tracking-[-0.03em] text-(--color-ink) sm:text-6xl">
                Operacion diaria con enfoque clinico y financiero.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-(--color-muted) sm:text-lg">
                Este dashboard resume el comportamiento del mes actual y deja lista la base para
                CRM de pacientes, caja, inventario y proveedores.
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
              title="Estado del MVP"
              value={summary.warning ? "Pendiente de datos reales" : "Conectado"}
              description={
                summary.warning ??
                "La base ya responde a consultas y el dashboard puede crecer con metricas por modulo."
              }
            />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="rounded-4xl border border-(--color-line) bg-white/86 p-7 shadow-(--shadow-card)">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
                  Arquitectura inicial
                </p>
                <h2 className="mt-3 font-display text-4xl leading-none tracking-[-0.03em] text-(--color-ink)">
                  Modulos del MVP
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-(--color-muted)">
                La primera version separa la operacion en dominios claros para crecer sin mezclar
                logica clinica, financiera e inventario.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">CRM Clinico</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Pacientes, antecedentes, notas medicas, ultimas visitas y proximos controles.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Flujo de Caja</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Ingresos por tratamiento o producto y egresos categorizados para control mensual.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Inventario</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Stock actual, lote, caducidad, niveles minimos y movimientos de entradas o salidas.
                </p>
              </div>
              <div className="rounded-3xl bg-(--color-panel) p-5">
                <p className="text-sm font-semibold text-(--color-ink)">Proveedores</p>
                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                  Laboratorios, asesores comerciales y productos asociados para trazabilidad.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-4xl border border-(--color-line) bg-[#23302b] p-7 text-[#f8f3ec] shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/56">
              Siguiente paso tecnico
            </p>
            <h2 className="mt-4 font-display text-4xl leading-none tracking-[-0.03em]">
              Migrar y sembrar datos iniciales.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              Una vez confirmes credenciales reales de Supabase, el siguiente paso es generar la
              migracion inicial y cargar catalogos base: tratamientos, productos, proveedores y
              primeras categorias de gasto.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold">Comandos base</p>
              <div className="mt-3 space-y-2 text-sm text-white/72">
                <p>
                  <code>npx prisma migrate dev --name init_clinic_mvp</code>
                </p>
                <p>
                  <code>npx prisma generate</code>
                </p>
                <p>
                  <code>npm run dev</code>
                </p>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
