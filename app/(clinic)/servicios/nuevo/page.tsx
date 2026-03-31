import Link from "next/link";
import { SaleItemType } from "@prisma/client";

import { createSaleItem } from "@/app/actions";
import {
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

export const dynamic = "force-dynamic";

export default function NewServicePage() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/servicios"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a servicios
        </Link>
      </div>

      <SectionHeading
        eyebrow="Nuevo servicio"
        title="Agregar servicio"
        description="En este formulario solo registras el nombre, el precio y el tipo del servicio."
      />

      <FormCard
        eyebrow="Formulario"
        title="Datos del servicio"
        description="Guarda el servicio para dejarlo disponible al registrar atenciones."
      >
        <form action={createSaleItem} className="grid gap-4">
          <input type="hidden" name="redirectTo" value="/servicios" />
          <div className={formGridClassName}>
            <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
            <Field label="Tipo">
              <select name="type" className={inputClassName} defaultValue="TREATMENT" required>
                {Object.values(SaleItemType).map((type) => (
                  <option key={type} value={type}>{saleItemTypeLabels[type]}</option>
                ))}
              </select>
            </Field>
            <Field label="Precio">
              <input name="unitPrice" type="number" step="0.01" min="0" className={inputClassName} required />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-muted)">Los demas datos no se muestran en este formulario.</p>
            <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
