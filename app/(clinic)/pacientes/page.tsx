import { PaymentMethod } from "@prisma/client";

import { createPatient, deletePatient, updatePatient } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, Notice, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatDateInput, formatMoney, paymentMethodLabels } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string; q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  let patients: Awaited<ReturnType<typeof prisma.patient.findMany>> = [];
  let saleItems: Array<{
    id: string;
    name: string;
    unitPrice: unknown;
    baseCost: unknown;
  }> = [];
  let pageError: string | null = null;

  try {
    [patients, saleItems] = await Promise.all([
      prisma.patient.findMany({
        where: query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { identification: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: [{ createdAt: "desc" }],
        take: 24,
      }),
      prisma.saleItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, unitPrice: true, baseCost: true },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la base de pacientes en este momento.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Clientes"
        title="Base de clientes"
        description="Aqui registras y consultas la ficha inicial de tus clientes."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo registro"
          title="Agregar cliente"
          description="Guarda la ficha del cliente y, si quieres, registra de una vez el servicio realizado, lo cobrado y sus costos."
        >
          <form action={createPatient} className="grid gap-4">
            <input type="hidden" name="redirectTo" value="/pacientes" />
            <div className={formGridClassName}>
              <Field label="Nombres"><input name="firstName" className={inputClassName} required /></Field>
              <Field label="Apellidos"><input name="lastName" className={inputClassName} required /></Field>
              <Field label="Identificacion"><input name="identification" className={inputClassName} required /></Field>
              <Field label="Telefono"><input name="phone" className={inputClassName} required /></Field>
              <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
              <Field label="Fecha de nacimiento"><input name="birthDate" type="date" className={inputClassName} /></Field>
              <Field label="Ultima visita"><input name="lastVisitAt" type="date" className={inputClassName} /></Field>
              <Field label="Proximo seguimiento"><input name="nextVisitAt" type="date" className={inputClassName} /></Field>
            </div>
            <Field label="Alergias"><textarea name="allergies" className={textareaClassName} /></Field>
            <Field label="Historial o servicios previos"><textarea name="previousTreatments" className={textareaClassName} /></Field>
            <Field label="Notas importantes"><textarea name="importantNotes" className={textareaClassName} /></Field>
            <div className="rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-muted)">Servicio inicial opcional</p>
              <div className="mt-4 grid gap-4">
                <div className={formGridClassName}>
                  <Field label="Servicio a realizar">
                    <select name="saleItemId" className={inputClassName} defaultValue="">
                      <option value="">Sin servicio inicial</option>
                      {saleItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · precio sugerido {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fecha y hora del servicio">
                    <input name="revenueOccurredAt" type="datetime-local" className={inputClassName} />
                  </Field>
                  <Field label="Cuanto le cobraste">
                    <input name="amount" type="number" step="0.01" min="0" className={inputClassName} />
                  </Field>
                  <Field label="Cuantos fueron los costos">
                    <input name="costAmount" type="number" step="0.01" min="0" className={inputClassName} />
                  </Field>
                  <Field label="Medio de pago">
                    <select name="paymentMethod" className={inputClassName} defaultValue="TRANSFER">
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabels[method]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Notas del servicio o del cobro">
                  <textarea name="revenueNotes" className={textareaClassName} />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">{patients.length} clientes visibles en esta lista.</p>
              <SubmitButton label="Guardar cliente" pendingLabel="Guardando cliente..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Listado"
          title="Clientes recientes"
          description="Busca por nombre, apellido, identificacion o telefono para encontrar clientes mas rapido."
        >
          <form method="GET" className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar paciente..."
              className={inputClassName}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[#2f5be7] px-5 py-3 text-sm font-semibold text-white"
            >
              Buscar
            </button>
            <a
              href="/pacientes"
              className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-5 py-3 text-sm font-semibold text-(--color-ink)"
            >
              Limpiar
            </a>
          </form>

          <div className="grid gap-3">
            {patients.length === 0 ? (
              <EmptyState>
                {query ? "No se encontraron pacientes con esa busqueda." : "Aun no hay clientes registrados."}
              </EmptyState>
            ) : (
              patients.map((patient) => (
                <div key={patient.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="font-semibold text-(--color-ink)">{patient.firstName} {patient.lastName}</p>
                  <p className="mt-1 text-sm text-(--color-muted)">{patient.identification} · {patient.phone}</p>
                  <p className="mt-2 text-sm text-(--color-muted)">Proximo seguimiento: {formatDate(patient.nextVisitAt)}</p>
                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <form action={updatePatient} className="grid gap-4">
                        <input type="hidden" name="id" value={patient.id} />
                        <div className={formGridClassName}>
                          <Field label="Nombres"><input name="firstName" defaultValue={patient.firstName} className={inputClassName} required /></Field>
                          <Field label="Apellidos"><input name="lastName" defaultValue={patient.lastName} className={inputClassName} required /></Field>
                          <Field label="Identificacion"><input name="identification" defaultValue={patient.identification} className={inputClassName} required /></Field>
                          <Field label="Telefono"><input name="phone" defaultValue={patient.phone} className={inputClassName} required /></Field>
                          <Field label="Correo"><input name="email" type="email" defaultValue={patient.email ?? ""} className={inputClassName} /></Field>
                          <Field label="Fecha de nacimiento"><input name="birthDate" type="date" defaultValue={formatDateInput(patient.birthDate)} className={inputClassName} /></Field>
                          <Field label="Ultima visita"><input name="lastVisitAt" type="date" defaultValue={formatDateInput(patient.lastVisitAt)} className={inputClassName} /></Field>
                          <Field label="Proximo seguimiento"><input name="nextVisitAt" type="date" defaultValue={formatDateInput(patient.nextVisitAt)} className={inputClassName} /></Field>
                        </div>
                        <Field label="Alergias"><textarea name="allergies" defaultValue={patient.allergies ?? ""} className={textareaClassName} /></Field>
                        <Field label="Historial o servicios previos"><textarea name="previousTreatments" defaultValue={patient.previousTreatments ?? ""} className={textareaClassName} /></Field>
                        <Field label="Notas importantes"><textarea name="importantNotes" defaultValue={patient.importantNotes ?? ""} className={textareaClassName} /></Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deletePatient}>
                        <input type="hidden" name="id" value={patient.id} />
                        <SubmitButton label="Eliminar cliente" pendingLabel="Eliminando..." variant="danger" />
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
