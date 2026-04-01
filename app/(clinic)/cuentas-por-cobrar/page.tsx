import Link from "next/link";
import { Prisma } from "@prisma/client";

import {
  createAccountReceivablePayment,
  deleteAccountReceivable,
  toggleAccountReceivableCompleted,
  updateAccountReceivable,
} from "@/app/actions";
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
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatDateInput, formatMoney, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountsReceivablePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let accountsReceivable: Array<{
    id: string;
    patientId: string;
    saleItemId: string;
    serviceDate: Date;
    totalAmount: Prisma.Decimal;
    financedInstallments: number;
    nextDueDate: Date | null;
    isCompleted: boolean;
    notes: string | null;
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
    payments: Array<{
      id: string;
      paidAt: Date;
      amount: Prisma.Decimal;
      notes: string | null;
    }>;
  }> = [];
  let patients: Array<{ id: string; firstName: string; lastName: string; identification: string }> = [];
  let saleItems: Array<{ id: string; name: string }> = [];
  let pageError: string | null = null;

  try {
    [accountsReceivable, patients, saleItems] = await Promise.all([
      prisma.accountReceivable.findMany({
        orderBy: [{ isCompleted: "asc" }, { nextDueDate: "asc" }, { serviceDate: "desc" }],
        take: 40,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          saleItem: {
            select: {
              name: true,
            },
          },
          payments: {
            select: {
              id: true,
              paidAt: true,
              amount: true,
              notes: true,
            },
            orderBy: [{ paidAt: "asc" }],
          },
        },
      }),
      prisma.patient.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, identification: true },
      }),
      prisma.saleItem.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de cuentas por cobrar.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Finanzas"
        title="Cuentas por cobrar"
        description="Aqui ves pacientes con servicios financiados, el numero de cuotas, las fechas pagadas, los abonos realizados y el saldo pendiente."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <FormCard
        eyebrow="Lista"
        title="Cuentas por cobrar registradas"
        description="Revisa el paciente, el servicio realizado, la fecha del servicio, las cuotas financiadas, los abonos y el saldo."
      >
        <div className="mb-5 flex justify-end">
          <Link
            href="/cuentas-por-cobrar/nuevo"
            className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Agregar cuenta
          </Link>
        </div>
        <div className="grid gap-3">
          {accountsReceivable.length === 0 ? (
            <EmptyState>Aun no hay cuentas por cobrar registradas.</EmptyState>
          ) : (
            accountsReceivable.map((item) => {
              const totalPaid = item.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
              const pendingAmount = toNumber(item.totalAmount) - totalPaid;

              return (
                <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{item.patient.firstName} {item.patient.lastName}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{item.saleItem.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">Saldo {formatMoney(pendingAmount)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-(--color-muted) sm:grid-cols-2">
                    <p>Fecha del servicio: {formatDate(item.serviceDate)}</p>
                    <p>Cuotas financiadas: {item.financedInstallments}</p>
                    <p>Total financiado: {formatMoney(item.totalAmount)}</p>
                    <p>Total abonado: {formatMoney(totalPaid)}</p>
                    <p>Proxima fecha de cobro: {formatDate(item.nextDueDate)}</p>
                    <p>Estado: {item.isCompleted ? "Completada" : "Pendiente"}</p>
                    <p className="sm:col-span-2">
                      Fechas pagadas: {item.payments.length > 0 ? item.payments.map((payment) => formatDate(payment.paidAt)).join(" · ") : "Sin pagos"}
                    </p>
                    <p className="sm:col-span-2">
                      Abonos: {item.payments.length > 0 ? item.payments.map((payment) => formatMoney(payment.amount)).join(" · ") : "Sin abonos"}
                    </p>
                  </div>
                  {item.notes ? <p className="mt-2 text-sm text-(--color-muted)">{item.notes}</p> : null}

                  <div className="mt-4 grid gap-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <form action={toggleAccountReceivableCompleted} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="redirectTo" value="/cuentas-por-cobrar" />
                      <input type="hidden" name="isCompleted" value={item.isCompleted ? "false" : "true"} />
                      <div className="inline-flex items-center gap-3 rounded-2xl border border-(--color-line) bg-white px-4 py-3 text-sm text-(--color-ink)">
                        <input type="checkbox" checked={item.isCompleted} readOnly className="h-4 w-4" />
                        <span>{item.isCompleted ? "Completada" : "Pendiente"}</span>
                        <button type="submit" className="font-semibold text-[#2f5be7]">
                          {item.isCompleted ? "Marcar pendiente" : "Marcar completada"}
                        </button>
                      </div>
                    </form>

                    <form action={createAccountReceivablePayment} className="grid gap-4">
                      <input type="hidden" name="accountReceivableId" value={item.id} />
                      <input type="hidden" name="redirectTo" value="/cuentas-por-cobrar" />
                      <div className={formGridClassName}>
                        <Field label="Fecha del abono">
                          <input name="paidAt" type="date" className={inputClassName} />
                        </Field>
                        <Field label="Valor del abono">
                          <input name="amount" type="number" step="0.01" min="0" className={inputClassName} required />
                        </Field>
                      </div>
                      <Field label="Notas del abono">
                        <textarea name="notes" className={textareaClassName} />
                      </Field>
                      <div className="flex justify-end">
                        <SubmitButton label="Registrar abono" pendingLabel="Guardando abono..." variant="secondary" />
                      </div>
                    </form>
                  </div>

                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <form action={updateAccountReceivable} className="grid gap-4">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="redirectTo" value="/cuentas-por-cobrar" />
                        <div className={formGridClassName}>
                          <Field label="Paciente">
                            <select name="patientId" defaultValue={item.patientId} className={inputClassName} required>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                  {patient.lastName}, {patient.firstName} · {patient.identification}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Servicio realizado">
                            <select name="saleItemId" defaultValue={item.saleItemId} className={inputClassName} required>
                              {saleItems.map((saleItem) => (
                                <option key={saleItem.id} value={saleItem.id}>
                                  {saleItem.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Fecha del servicio">
                            <input name="serviceDate" type="date" defaultValue={formatDateInput(item.serviceDate)} className={inputClassName} required />
                          </Field>
                          <Field label="Monto financiado">
                            <input name="totalAmount" type="number" step="0.01" min="0" defaultValue={String(item.totalAmount)} className={inputClassName} required />
                          </Field>
                          <Field label="Numero de cuotas">
                            <input name="financedInstallments" type="number" min="1" defaultValue={String(item.financedInstallments)} className={inputClassName} required />
                          </Field>
                          <Field label="Proxima fecha de cobro">
                            <input name="nextDueDate" type="date" defaultValue={formatDateInput(item.nextDueDate)} className={inputClassName} />
                          </Field>
                        </div>
                        <Field label="Notas">
                          <textarea name="notes" defaultValue={item.notes ?? ""} className={textareaClassName} />
                        </Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteAccountReceivable}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="redirectTo" value="/cuentas-por-cobrar" />
                        <SubmitButton label="Eliminar cuenta" pendingLabel="Eliminando..." variant="danger" />
                      </form>
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </div>
      </FormCard>
    </>
  );
}
