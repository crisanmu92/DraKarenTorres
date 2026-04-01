import Link from "next/link";

import {
  deleteAccountPayable,
  toggleAccountPayableCompleted,
  updateAccountPayable,
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
import { formatDate, formatDateInput, formatMoney } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountsPayablePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let accountsPayable: Array<{
    id: string;
    creditorName: string;
    description: string;
    amount: unknown;
    debtDate: Date;
    nextPaymentDate: Date | null;
    paidAt: Date | null;
    isCompleted: boolean;
    notes: string | null;
    supplierId: string | null;
  }> = [];
  let suppliers: Array<{ id: string; companyName: string }> = [];
  let pageError: string | null = null;

  try {
    [accountsPayable, suppliers] = await Promise.all([
      prisma.accountPayable.findMany({
        orderBy: [{ isCompleted: "asc" }, { nextPaymentDate: "asc" }, { debtDate: "desc" }],
        take: 40,
        select: {
          id: true,
          creditorName: true,
          description: true,
          amount: true,
          debtDate: true,
          nextPaymentDate: true,
          paidAt: true,
          isCompleted: true,
          notes: true,
          supplierId: true,
        },
      }),
      prisma.supplier.findMany({
        orderBy: [{ companyName: "asc" }],
        select: { id: true, companyName: true },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de cuentas por pagar.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Finanzas"
        title="Cuentas por pagar"
        description="Lleva una lista de deudas pendientes con su fecha de deuda, proximo pago, fecha de pago y estado de completado."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <FormCard
        eyebrow="Lista"
        title="Cuentas por pagar registradas"
        description="Aqui ves la deuda, la siguiente fecha de pago, la fecha en que se pago y si ya esta completada."
      >
        <div className="mb-5 flex justify-end">
          <Link
            href="/cuentas-por-pagar/nuevo"
            className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Agregar cuenta
          </Link>
        </div>
        <div className="grid gap-3">
          {accountsPayable.length === 0 ? (
            <EmptyState>Aun no hay cuentas por pagar registradas.</EmptyState>
          ) : (
            accountsPayable.map((item) => (
              <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-(--color-ink)">{item.creditorName}</p>
                    <p className="mt-1 text-sm text-(--color-muted)">{item.description}</p>
                  </div>
                  <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(item.amount)}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-(--color-muted) sm:grid-cols-2">
                  <p>Fecha de la deuda: {formatDate(item.debtDate)}</p>
                  <p>Fecha proxima de pago: {formatDate(item.nextPaymentDate)}</p>
                  <p>Fecha de pago: {formatDate(item.paidAt)}</p>
                  <form action={toggleAccountPayableCompleted} className="sm:col-span-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="redirectTo" value="/cuentas-por-pagar" />
                    <input type="hidden" name="isCompleted" value={item.isCompleted ? "false" : "true"} />
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-(--color-line) bg-[#f8fbff] px-4 py-3 text-sm text-(--color-ink)">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        readOnly
                        className="h-4 w-4"
                      />
                      <span>{item.isCompleted ? "Pagada" : "Pendiente"}</span>
                      <button type="submit" className="font-semibold text-[#2f5be7]">
                        {item.isCompleted ? "Marcar pendiente" : "Marcar pagada"}
                      </button>
                    </div>
                  </form>
                </div>
                {item.notes ? <p className="mt-2 text-sm text-(--color-muted)">{item.notes}</p> : null}
                <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                    Editar o eliminar
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <form action={updateAccountPayable} className="grid gap-4">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="redirectTo" value="/cuentas-por-pagar" />
                      <div className={formGridClassName}>
                        <Field label="Acreedor">
                          <input name="creditorName" defaultValue={item.creditorName} className={inputClassName} required />
                        </Field>
                        <Field label="Proveedor relacionado">
                          <select name="supplierId" defaultValue={item.supplierId ?? ""} className={inputClassName}>
                            <option value="">Sin proveedor</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.companyName}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Concepto">
                          <input name="description" defaultValue={item.description} className={inputClassName} required />
                        </Field>
                        <Field label="Monto">
                          <input name="amount" type="number" step="0.01" min="0" defaultValue={String(item.amount)} className={inputClassName} required />
                        </Field>
                        <Field label="Fecha de la deuda">
                          <input name="debtDate" type="date" defaultValue={formatDateInput(item.debtDate)} className={inputClassName} required />
                        </Field>
                        <Field label="Fecha proxima de pago">
                          <input name="nextPaymentDate" type="date" defaultValue={formatDateInput(item.nextPaymentDate)} className={inputClassName} />
                        </Field>
                        <Field label="Fecha de pago">
                          <input name="paidAt" type="date" defaultValue={formatDateInput(item.paidAt)} className={inputClassName} />
                        </Field>
                      </div>
                      <Field label="Notas">
                        <textarea name="notes" defaultValue={item.notes ?? ""} className={textareaClassName} />
                      </Field>
                      <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                    </form>
                    <form action={deleteAccountPayable}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="redirectTo" value="/cuentas-por-pagar" />
                      <SubmitButton label="Eliminar cuenta" pendingLabel="Eliminando..." variant="danger" />
                    </form>
                  </div>
                </details>
              </div>
            ))
          )}
        </div>
      </FormCard>
    </>
  );
}
