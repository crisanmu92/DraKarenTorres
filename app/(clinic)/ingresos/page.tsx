import { PaymentMethod } from "@prisma/client";

import { createRevenue } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatMoney, paymentMethodLabels } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RevenuesPage() {
  const [patients, saleItems, revenues] = await Promise.all([
    prisma.patient.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, identification: true },
    }),
    prisma.saleItem.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitPrice: true },
    }),
    prisma.revenue.findMany({
      include: { patient: true, saleItem: true },
      orderBy: [{ occurredAt: "desc" }],
      take: 12,
    }),
  ]);

  return (
    <>
      <SectionHeading
        eyebrow="Ingresos"
        title="Caja e ingresos"
        description="Registra tratamientos o ventas cobradas para mantener actualizada la caja."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo ingreso"
          title="Registrar ingreso"
          description="Relaciona paciente, item vendido, medio de pago y monto."
        >
          <form action={createRevenue} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
              <Field label="Monto"><input name="amount" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
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
                <select name="paymentMethod" className={inputClassName} defaultValue="TRANSFER" required>
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>{paymentMethodLabels[method]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">Cada ingreso actualiza tu dashboard y la caja diaria.</p>
              <SubmitButton label="Registrar ingreso" pendingLabel="Guardando ingreso..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Movimientos recientes"
          title="Ingresos recientes"
          description="Ultimos cobros registrados en el sistema."
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
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(revenue.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(revenue.occurredAt)}</p>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </>
  );
}
