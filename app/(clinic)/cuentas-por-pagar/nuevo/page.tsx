import Link from "next/link";

import { createAccountPayable } from "@/app/actions";
import {
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewAccountPayablePage() {
  let suppliers: Array<{ id: string; companyName: string }> = [];

  try {
    suppliers = await prisma.supplier.findMany({
      orderBy: [{ companyName: "asc" }],
      select: { id: true, companyName: true },
    });
  } catch {}

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/cuentas-por-pagar"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a cuentas por pagar
        </Link>
      </div>

      <SectionHeading
        eyebrow="Nueva cuenta"
        title="Agregar cuenta por pagar"
        description="Registra la deuda y marca cuando ya se haya pagado."
      />

      <FormCard
        eyebrow="Formulario"
        title="Datos de la cuenta"
        description="Completa los datos de la deuda para que quede registrada en la lista."
      >
        <form action={createAccountPayable} className="grid gap-4">
          <input type="hidden" name="redirectTo" value="/cuentas-por-pagar" />
          <div className={formGridClassName}>
            <Field label="Acreedor">
              <input name="creditorName" className={inputClassName} required />
            </Field>
            <Field label="Proveedor relacionado">
              <select name="supplierId" className={inputClassName} defaultValue="">
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.companyName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Concepto">
              <input name="description" className={inputClassName} required />
            </Field>
            <Field label="Monto">
              <input name="amount" type="number" step="0.01" min="0" className={inputClassName} required />
            </Field>
            <Field label="Fecha de la deuda">
              <input name="debtDate" type="date" className={inputClassName} required />
            </Field>
            <Field label="Fecha proxima de pago">
              <input name="nextPaymentDate" type="date" className={inputClassName} />
            </Field>
            <Field label="Fecha de pago">
              <input name="paidAt" type="date" className={inputClassName} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea name="notes" className={textareaClassName} />
          </Field>
          <div className="flex items-center justify-end gap-3">
            <SubmitButton label="Guardar cuenta" pendingLabel="Guardando cuenta..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
