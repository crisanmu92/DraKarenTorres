import Link from "next/link";
import { SaleItemType } from "@prisma/client";

import { createSaleItem } from "@/app/actions";
import { ServiceCostBuilder } from "@/components/clinic/service-cost-builder";
import {
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const rawProducts = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, costPrice: true },
  });
  const products = rawProducts.map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    costPrice: toNumber(product.costPrice),
  }));

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
        description="Define cuanto cobras, que productos del inventario usa y deja listo el calculo automatico de costo y utilidad."
      />

      <FormCard
        eyebrow="Configuracion"
        title="Datos del servicio"
        description="Si eliges productos del inventario, el sistema usara esas cantidades para calcular costos y descontar stock cada vez que el servicio se registre."
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
          </div>
          <Field label="Descripcion"><textarea name="description" className={textareaClassName} /></Field>
          <ServiceCostBuilder products={products} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-muted)">El costo se calculara automaticamente con base en los productos usados.</p>
            <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
