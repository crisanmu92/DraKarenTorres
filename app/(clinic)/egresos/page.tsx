import { ExpenseCategory } from "@prisma/client";

import { createExpense, deleteExpense, updateExpense } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, Notice, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { expenseCategoryLabels, formatDate, formatDateTimeInput, formatMoney } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let expenses: Awaited<ReturnType<typeof prisma.expense.findMany>> = [];
  let pageError: string | null = null;

  try {
    expenses = await prisma.expense.findMany({
      orderBy: [{ occurredAt: "desc" }],
      take: 12,
    });
  } catch {
    pageError = "No se pudo cargar la informacion de egresos en este momento.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Egresos"
        title="Costos y gastos"
        description="Registra egresos operativos, compras, software, impuestos y otros costos."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo egreso"
          title="Registrar egreso"
          description="Usa categorias claras para que el dashboard financiero tenga sentido."
        >
          <form action={createExpense} className="grid gap-4">
            <input type="hidden" name="redirectTo" value="/egresos" />
            <div className={formGridClassName}>
              <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
              <Field label="Monto"><input name="amount" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
              <Field label="Categoria">
                <select name="category" className={inputClassName} defaultValue="SUPPLIES" required>
                  {Object.values(ExpenseCategory).map((category) => (
                    <option key={category} value={category}>{expenseCategoryLabels[category]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Descripcion"><input name="description" className={inputClassName} required /></Field>
            </div>
            <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">Usa descripciones claras para distinguir gastos fijos y compras.</p>
              <SubmitButton label="Registrar egreso" pendingLabel="Guardando egreso..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Movimientos recientes"
          title="Egresos recientes"
          description="Ultimos costos registrados en el sistema."
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
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(expense.amount)}</p>
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
      </div>
    </>
  );
}
