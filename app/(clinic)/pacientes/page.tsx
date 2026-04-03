import Link from "next/link";

import { deletePatient, updatePatient } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { ExportLink } from "@/components/forms/export-link";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatDateInput, formatMoney, getNetAmount, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6Z" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.75 20.25 4.5-1.125L19.5 7.875 16.125 4.5 4.875 15.75 3.75 20.25Z" />
      <path d="m14.625 6 3.375 3.375" />
      <path d="M3.75 20.25h16.5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5h15" />
      <path d="M9.75 3.75h4.5l.75 1.5h3.75v15A1.5 1.5 0 0 1 17.25 21.75H6.75A1.5 1.5 0 0 1 5.25 20.25v-15H9Z" />
      <path d="M9.75 11.25v5.25" />
      <path d="M14.25 11.25v5.25" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string; q?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  let patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    identification: string;
    email: string | null;
    birthDate: Date | null;
    allergies: string | null;
    previousTreatments: string | null;
    importantNotes: string | null;
    lastVisitAt: Date | null;
    nextVisitAt: Date | null;
    revenues: Array<{ id: string; amount: unknown; discountAmount: unknown; costAmount: unknown }>;
  }> = [];
  let pageError: string | null = null;

  try {
    patients = await prisma.patient.findMany({
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
      take: 40,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        identification: true,
        email: true,
        birthDate: true,
        allergies: true,
        previousTreatments: true,
        importantNotes: true,
        lastVisitAt: true,
        nextVisitAt: true,
        revenues: {
          select: {
            id: true,
            amount: true,
            discountAmount: true,
            costAmount: true,
          },
        },
      },
    });
  } catch {
    pageError = "No se pudo cargar la base de pacientes en este momento.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Pacientes"
        title="Lista de pacientes"
        description="Consulta tu base de pacientes en formato lista y entra a cada ficha para agregar los servicios realizados."
      />

      <div className="flex justify-end">
        <ExportLink section="patients" label="Descargar Excel de pacientes" />
      </div>

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <div className="grid gap-4">
        <FormCard
          eyebrow="Listado"
          title="Pacientes registrados"
          description="Usa la accion ver para abrir la ficha del paciente y agregarle los servicios realizados."
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form method="GET" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:flex-1">
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
              <Link
                href="/pacientes"
                className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-5 py-3 text-sm font-semibold text-(--color-ink)"
              >
                Limpiar
              </Link>
            </form>
            <Link
              href="/pacientes/nuevo"
              className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
            >
              Agregar paciente
            </Link>
          </div>

          {patients.length === 0 ? (
            <EmptyState>
              {query ? "No se encontraron pacientes con esa busqueda." : "Aun no hay pacientes registrados."}
            </EmptyState>
          ) : (
          <div className="overflow-visible rounded-[28px] border border-(--color-line)">
              <div className="hidden bg-[#f8f6f2] px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted) md:grid md:grid-cols-[minmax(220px,1.3fr)_minmax(140px,0.8fr)_minmax(150px,0.75fr)_minmax(170px,0.85fr)_minmax(170px,0.95fr)_180px] md:gap-4">
                <p>Nombre</p>
                <p>Telefono</p>
                <p>Servicios hechos</p>
                <p>Total cobrado</p>
                <p>Ganancia acumulada</p>
                <p>Acciones</p>
              </div>
              <div className="divide-y divide-(--color-line)">
                {patients.map((patient) => {
                  const fullName = `${patient.firstName} ${patient.lastName}`;
                  const totalCharged = patient.revenues.reduce(
                    (sum, revenue) => sum + getNetAmount(revenue.amount, revenue.discountAmount),
                    0,
                  );
                  const totalProfit = patient.revenues.reduce(
                    (sum, revenue) =>
                      sum + (getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount)),
                    0,
                  );

                  return (
                    <div key={patient.id} className="bg-white">
                      <div className="grid gap-3 px-4 py-5 md:grid-cols-[minmax(220px,1.3fr)_minmax(140px,0.8fr)_minmax(150px,0.75fr)_minmax(170px,0.85fr)_minmax(170px,0.95fr)_180px] md:items-center md:gap-4">
                        <div>
                          <p className="font-semibold text-(--color-ink)">{fullName}</p>
                          <p className="mt-1 text-sm text-(--color-muted)">{patient.identification}</p>
                        </div>
                        <p className="text-sm text-(--color-ink)">{patient.phone || "-"}</p>
                        <p className="text-sm text-(--color-ink)">{patient.revenues.length}</p>
                        <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(totalCharged)}</p>
                        <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(totalProfit)}</p>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/pacientes/${patient.id}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe5ff] bg-[#eef4ff] text-[#2f5be7]"
                            aria-label={`Ver ${fullName}`}
                          >
                            <ViewIcon />
                          </Link>
                          <details className="relative">
                            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-[#fde7ad] bg-[#fff7df] text-[#d39a00]">
                              <EditIcon />
                            </summary>
                            <div className="absolute right-0 z-10 mt-3 w-[min(92vw,38rem)] rounded-[28px] border border-(--color-line) bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
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
                            </div>
                          </details>
                          <form action={deletePatient}>
                            <input type="hidden" name="id" value={patient.id} />
                            <button
                              type="submit"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ffd4d1] bg-[#fff0ef] text-[#ef4444]"
                              aria-label={`Eliminar ${fullName}`}
                            >
                              <DeleteIcon />
                            </button>
                          </form>
                        </div>
                      </div>
                      <div className="grid gap-2 border-t border-(--color-line) bg-[#fcfaf7] px-4 py-3 text-sm text-(--color-muted) md:hidden">
                        <p>Telefono: {patient.phone || "-"}</p>
                        <p>Servicios hechos: {patient.revenues.length}</p>
                        <p>Total cobrado: {formatMoney(totalCharged)}</p>
                        <p>Ganancia acumulada: {formatMoney(totalProfit)}</p>
                        <p>Proximo seguimiento: {formatDate(patient.nextVisitAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </FormCard>
      </div>
    </>
  );
}
