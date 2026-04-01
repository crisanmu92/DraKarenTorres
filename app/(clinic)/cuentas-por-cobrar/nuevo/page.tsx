import Link from "next/link";

import { createAccountReceivable } from "@/app/actions";
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

export default async function NewAccountReceivablePage() {
  let patients: Array<{ id: string; firstName: string; lastName: string; identification: string }> = [];
  let saleItems: Array<{ id: string; name: string }> = [];

  try {
    [patients, saleItems] = await Promise.all([
      prisma.patient.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, identification: true },
      }),
      prisma.saleItem.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
  } catch {}

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/cuentas-por-cobrar"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a cuentas por cobrar
        </Link>
      </div>

      <SectionHeading
        eyebrow="Nueva cuenta"
        title="Agregar cuenta por cobrar"
        description="Registra el paciente, el servicio realizado, la fecha del servicio y las cuotas financiadas."
      />

      <FormCard
        eyebrow="Formulario"
        title="Datos de la cuenta"
        description="Completa la financiacion del servicio para que luego puedas registrar abonos y controlar el saldo."
      >
        <form action={createAccountReceivable} className="grid gap-4">
          <input type="hidden" name="redirectTo" value="/cuentas-por-cobrar" />
          <div className={formGridClassName}>
            <Field label="Paciente">
              <select name="patientId" className={inputClassName} defaultValue="" required>
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.lastName}, {patient.firstName} · {patient.identification}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Servicio realizado">
              <select name="saleItemId" className={inputClassName} defaultValue="" required>
                <option value="">Selecciona un servicio</option>
                {saleItems.map((saleItem) => (
                  <option key={saleItem.id} value={saleItem.id}>
                    {saleItem.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha del servicio">
              <input name="serviceDate" type="date" className={inputClassName} required />
            </Field>
            <Field label="Monto financiado">
              <input name="totalAmount" type="number" step="0.01" min="0" className={inputClassName} required />
            </Field>
            <Field label="Numero de cuotas">
              <input name="financedInstallments" type="number" min="1" className={inputClassName} required />
            </Field>
            <Field label="Proxima fecha de cobro">
              <input name="nextDueDate" type="date" className={inputClassName} />
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
