import { ExpenseCategory, PaymentMethod } from "@prisma/client";

import { deleteExpense, deleteRevenue, updateExpense, updateRevenue } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  formGridClassName,
  inputClassName,
  SectionHeading,
  textareaClassName,
  sectionCardClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { expenseCategoryLabels, formatDate, formatDateTimeInput, formatMoney, paymentMethodLabels, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
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
    baseCost: unknown;
  }> = [];
  let revenues: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    paymentMethod: PaymentMethod;
    notes: string | null;
    patientId: string;
    saleItemId: string;
    costAmount: unknown;
    patient: { firstName: string; lastName: string };
    saleItem: { name: string };
  }> = [];
  let expenses: Array<{
    id: string;
    occurredAt: Date;
    amount: unknown;
    category: ExpenseCategory;
    description: string;
    notes: string | null;
  }> = [];
  let pageError: string | null = null;

  try {
    [patients, saleItems, revenues, expenses] = await Promise.all([
      prisma.patient.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, identification: true },
      }),
      prisma.saleItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, unitPrice: true, baseCost: true },
      }),
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
  } catch {
    pageError = "No se pudo cargar la informacion de movimientos.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Movimientos"
        title="Movimientos financieros"
        description="Aqui revisas rapidamente entradas y salidas recientes de dinero."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

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
                      <p className="mt-1 text-sm text-(--color-muted)">
                        Costo: {formatMoney(revenue.costAmount)} · Ganancia: {formatMoney(toNumber(revenue.amount) - toNumber(revenue.costAmount))}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#16a34a]">{formatMoney(revenue.amount)}</p>
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
                                  {item.name} · {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Costo real">
                            <input name="costAmount" type="number" step="0.01" min="0" defaultValue={revenue.costAmount == null ? "" : String(revenue.costAmount)} className={inputClassName} />
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
                      <p className="mt-1 text-sm text-(--color-muted)">{expenseCategoryLabels[expense.category]}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#b91c1c]">{formatMoney(expense.amount)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(expense.occurredAt)}</p>
                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <form action={updateExpense} className="grid gap-4">
                        <input type="hidden" name="id" value={expense.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(expense.occurredAt)} className={inputClassName} /></Field>
                          <Field label="Monto"><input name="amount" type="number" step="0.01" min="0" defaultValue={String(expense.amount)} className={inputClassName} required /></Field>
                          <Field label="Categoria">
                            <select name="category" defaultValue={expense.category} className={inputClassName} required>
                              {Object.values(ExpenseCategory).map((category) => (
                                <option key={category} value={category}>{expenseCategoryLabels[category]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Descripcion"><input name="description" defaultValue={expense.description} className={inputClassName} required /></Field>
                        </div>
                        <Field label="Notas"><textarea name="notes" defaultValue={expense.notes ?? ""} className={textareaClassName} /></Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteExpense}>
                        <input type="hidden" name="id" value={expense.id} />
                        <SubmitButton label="Eliminar egreso" pendingLabel="Eliminando..." variant="danger" />
                      </form>
                    </div>
                  </details>
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
