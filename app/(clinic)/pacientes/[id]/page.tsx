import Link from "next/link";
import { PaymentMethod } from "@prisma/client";

import { createRevenue, deleteRevenue, updateRevenue } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  SectionHeading,
  formGridClassName,
  inputClassName,
  sectionCardClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  formatDate,
  formatDateTimeInput,
  formatMoney,
  getNetAmount,
  paymentMethodLabels,
  toNumber,
} from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let patient: {
    id: string;
    firstName: string;
    lastName: string;
    identification: string;
    phone: string;
    email: string | null;
    nextVisitAt: Date | null;
    importantNotes: string | null;
    revenues: Array<{
      id: string;
      occurredAt: Date;
      amount: unknown;
      discountAmount: unknown;
      costAmount: unknown;
      paymentMethod: PaymentMethod;
      notes: string | null;
      patientId: string;
      saleItemId: string;
      saleItem: { name: string };
    }>;
  } | null = null;
  let saleItems: Array<{
    id: string;
    name: string;
    unitPrice: unknown;
    baseCost: unknown;
  }> = [];
  let pageError: string | null = null;

  try {
    [patient, saleItems] = await Promise.all([
      prisma.patient.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          identification: true,
          phone: true,
          email: true,
          nextVisitAt: true,
          importantNotes: true,
          revenues: {
            include: { saleItem: { select: { name: true } } },
            orderBy: [{ occurredAt: "desc" }],
            take: 20,
          },
        },
      }),
      prisma.saleItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, unitPrice: true, baseCost: true },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la ficha del paciente.";
  }

  if (!patient && !pageError) {
    pageError = "No se encontro el paciente solicitado.";
  }

  const totalCharged =
    patient?.revenues.reduce(
      (sum, revenue) => sum + getNetAmount(revenue.amount, revenue.discountAmount),
      0,
    ) ?? 0;
  const totalCost = patient?.revenues.reduce((sum, revenue) => sum + toNumber(revenue.costAmount), 0) ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/pacientes"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a pacientes
        </Link>
      </div>

      <SectionHeading
        eyebrow="Paciente"
        title={patient ? `${patient.firstName} ${patient.lastName}` : "Ficha del paciente"}
        description="Aqui registras los servicios realizados. El sistema calcula costos y utilidad con base en los productos del inventario usados por cada servicio."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      {patient ? (
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <article className={sectionCardClassName}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Telefono</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{patient.phone}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Identificacion</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{patient.identification}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Correo</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{patient.email ?? "Sin correo"}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Proximo seguimiento</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{formatDate(patient.nextVisitAt)}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Total cobrado</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{formatMoney(totalCharged)}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Ganancia acumulada</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{formatMoney(totalCharged - totalCost)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Notas importantes</p>
                <p className="mt-2 text-sm leading-6 text-(--color-ink)">{patient.importantNotes ?? "Sin notas importantes."}</p>
              </div>
            </article>

            <FormCard
              eyebrow="Nuevo servicio"
              title="Agregar servicio realizado"
              description="Cada servicio queda guardado con el monto cobrado y el sistema calcula costo y ganancia automaticamente."
            >
              <form action={createRevenue} className="grid gap-4">
                <input type="hidden" name="patientId" value={patient.id} />
                <input type="hidden" name="redirectTo" value={`/pacientes/${patient.id}`} />
                <div className={formGridClassName}>
                  <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
                  <Field label="Servicio">
                    <select name="saleItemId" className={inputClassName} required>
                      <option value="">Selecciona un servicio</option>
                      {saleItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · precio sugerido {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cuanto le cobraste"><input name="amount" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
                  <Field label="Descuento"><input name="discountAmount" type="number" step="0.01" min="0" className={inputClassName} /></Field>
                  <Field label="Medio de pago">
                    <select name="paymentMethod" className={inputClassName} defaultValue="TRANSFER" required>
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabels[method]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
                <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
              </form>
            </FormCard>
          </div>

          <FormCard
            eyebrow="Historial"
            title="Servicios realizados"
            description="Aqui ves los servicios ya hechos al paciente y puedes corregir o eliminar cualquier registro."
          >
            <div className="grid gap-3">
              {patient.revenues.length === 0 ? (
                <EmptyState>Este paciente aun no tiene servicios registrados.</EmptyState>
              ) : (
                patient.revenues.map((revenue) => (
                  <div key={revenue.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-(--color-ink)">{revenue.saleItem.name}</p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {formatDate(revenue.occurredAt)} · {paymentMethodLabels[revenue.paymentMethod]}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          Cobrado: {formatMoney(revenue.amount)} · Descuento: {formatMoney(revenue.discountAmount)} · Neto: {formatMoney(getNetAmount(revenue.amount, revenue.discountAmount))}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          Costo: {formatMoney(revenue.costAmount)} · Ganancia: {formatMoney(getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount))}
                        </p>
                      </div>
                    </div>
                    <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                        Editar o eliminar
                      </summary>
                      <div className="mt-4 grid gap-4">
                        <form action={updateRevenue} className="grid gap-4">
                          <input type="hidden" name="id" value={revenue.id} />
                          <div className={formGridClassName}>
                            <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(revenue.occurredAt)} className={inputClassName} /></Field>
                            <Field label="Servicio">
                              <select name="saleItemId" defaultValue={revenue.saleItemId} className={inputClassName} required>
                                {saleItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} · precio sugerido {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Cuanto le cobraste"><input name="amount" type="number" step="0.01" min="0" defaultValue={String(revenue.amount)} className={inputClassName} required /></Field>
                            <Field label="Descuento">
                              <input
                                name="discountAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={revenue.discountAmount == null ? "" : String(revenue.discountAmount)}
                                className={inputClassName}
                              />
                            </Field>
                          <Field label="Medio de pago">
                            <select name="paymentMethod" defaultValue={revenue.paymentMethod} className={inputClassName} required>
                                {Object.values(PaymentMethod).map((method) => (
                                  <option key={method} value={method}>
                                    {paymentMethodLabels[method]}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <Field label="Notas"><textarea name="notes" defaultValue={revenue.notes ?? ""} className={textareaClassName} /></Field>
                          <input type="hidden" name="patientId" value={patient.id} />
                          <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                        </form>
                        <form action={deleteRevenue}>
                          <input type="hidden" name="id" value={revenue.id} />
                          <SubmitButton label="Eliminar servicio" pendingLabel="Eliminando..." variant="danger" />
                        </form>
                      </div>
                    </details>
                  </div>
                ))
              )}
            </div>
          </FormCard>
        </div>
      ) : null}
    </>
  );
}
