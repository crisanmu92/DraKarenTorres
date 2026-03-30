import { PaymentMethod } from "@prisma/client";

import { createRevenue, deleteRevenue, updateRevenue } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, Notice, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatDateTimeInput, formatMoney, paymentMethodLabels } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RevenuesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    identification: string;
  }> = [];
  let saleItems: Array<{
    id: string;
    name: string;
    unitPrice: unknown;
  }> = [];
  let revenues: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    paymentMethod: PaymentMethod;
    notes: string | null;
    patientId: string;
    saleItemId: string;
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
  }> = [];
  let pageError: string | null = null;

  try {
    [patients, saleItems, revenues] = await Promise.all([
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
  } catch {
    pageError = "No se pudo cargar la informacion de ingresos en este momento.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Ingresos"
        title="Caja e ingresos"
        description="Registra cobros, ventas o servicios para mantener actualizada la caja."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo ingreso"
          title="Registrar ingreso"
          description="Relaciona cliente, concepto cobrado, medio de pago y monto."
        >
          <form action={createRevenue} className="grid gap-4">
            <input type="hidden" name="redirectTo" value="/ingresos" />
            <div className={formGridClassName}>
              <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
              <Field label="Monto"><input name="amount" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
              <Field label="Cliente">
                <select name="patientId" className={inputClassName} required>
                  <option value="">Selecciona un cliente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.lastName}, {patient.firstName} · {patient.identification}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Concepto o servicio">
                <select name="saleItemId" className={inputClassName} required>
                  <option value="">Selecciona un concepto</option>
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
          description="Ultimos cobros o entradas de dinero registrados en el sistema."
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
                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <form action={updateRevenue} className="grid gap-4">
                        <input type="hidden" name="id" value={revenue.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(revenue.occurredAt)} className={inputClassName} /></Field>
                          <Field label="Monto"><input name="amount" type="number" step="0.01" min="0" defaultValue={String(revenue.amount)} className={inputClassName} required /></Field>
                          <Field label="Cliente">
                            <select name="patientId" defaultValue={revenue.patientId} className={inputClassName} required>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.lastName}, {patient.firstName} · {patient.identification}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Concepto o servicio">
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
                        <Field label="Notas"><textarea name="notes" defaultValue={revenue.notes ?? ""} className={textareaClassName} /></Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteRevenue}>
                        <input type="hidden" name="id" value={revenue.id} />
                        <SubmitButton label="Eliminar ingreso" pendingLabel="Eliminando..." variant="danger" />
                      </form>
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </>
  );
}
