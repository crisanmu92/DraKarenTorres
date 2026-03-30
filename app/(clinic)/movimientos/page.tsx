import { EmptyState, FormCard, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import { formatDate, formatMoney, paymentMethodLabels } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
  const [revenues, expenses] = await Promise.all([
    prisma.revenue.findMany({
      include: { patient: true, saleItem: true },
      orderBy: [{ occurredAt: "desc" }],
      take: 12,
    }),
    prisma.expense.findMany({
      orderBy: [{ occurredAt: "desc" }],
      take: 12,
    }),
  ]);

  return (
    <>
      <SectionHeading
        eyebrow="Movimientos"
        title="Movimientos financieros"
        description="Aqui revisas rapidamente entradas y salidas recientes de dinero."
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <FormCard
          eyebrow="Entradas"
          title="Ingresos recientes"
          description="Ultimos cobros registrados en la aplicacion."
        >
          <div className="grid gap-3">
            {revenues.length === 0 ? (
              <EmptyState>Aun no hay ingresos registrados.</EmptyState>
            ) : (
              revenues.map((revenue) => (
                <div key={revenue.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
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
        </FormCard>

        <FormCard
          eyebrow="Salidas"
          title="Egresos recientes"
          description="Ultimos gastos o pagos registrados."
        >
          <div className="grid gap-3">
            {expenses.length === 0 ? (
              <EmptyState>Aun no hay egresos registrados.</EmptyState>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{expense.description}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#b91c1c]">{formatMoney(expense.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(expense.occurredAt)}</p>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </section>

      <article className={sectionCardClassName}>
        <SectionHeading
          eyebrow="Acciones"
          title="Registrar nuevos movimientos"
          description="Usa estos accesos para registrar nuevas entradas o salidas."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="/ingresos" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Registrar ingreso
          </a>
          <a href="/egresos" className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 text-sm font-semibold text-(--color-ink)">
            Registrar egreso
          </a>
        </div>
      </article>
    </>
  );
}
