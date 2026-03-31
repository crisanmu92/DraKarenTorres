import Link from "next/link";

import { createSupplier } from "@/app/actions";
import {
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

export default function NewSupplierPage() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/proveedores"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a proveedores
        </Link>
      </div>

      <SectionHeading
        eyebrow="Nuevo proveedor"
        title="Agregar proveedor"
        description="Registra laboratorios o distribuidores. Las compras se cargan despues dentro de la ficha del proveedor."
      />

      <FormCard
        eyebrow="Ficha inicial"
        title="Datos del proveedor"
        description="Guarda el proveedor y luego entra a su ficha para registrar productos o insumos comprados."
      >
        <form action={createSupplier} className="grid gap-4">
          <div className={formGridClassName}>
            <Field label="Empresa"><input name="companyName" className={inputClassName} required /></Field>
            <Field label="Asesor comercial"><input name="commercialAdvisor" className={inputClassName} /></Field>
            <Field label="Telefono"><input name="phone" className={inputClassName} /></Field>
            <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
          </div>
          <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-muted)">Las compras se agregan dentro de cada proveedor.</p>
            <SubmitButton label="Guardar proveedor" pendingLabel="Guardando proveedor..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
