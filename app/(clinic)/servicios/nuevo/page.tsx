import Link from "next/link";
import { SaleItemType } from "@prisma/client";

import { createSaleItem } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatMoney } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

export const dynamic = "force-dynamic";

const componentSlots = 5;

export default async function NewServicePage() {
  let products: Array<{
    id: string;
    name: string;
    unit: string;
    costPrice: unknown;
  }> = [];

  try {
    products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        unit: true,
        costPrice: true,
      },
    });
  } catch {}

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
        description="Registra el nombre, el precio, el tipo y, si quieres, los suministros del inventario que usa este servicio."
      />

      <FormCard
        eyebrow="Formulario"
        title="Datos del servicio"
        description="Los suministros son opcionales. Si los agregas, despues el sistema puede calcular costos y descontar inventario automaticamente."
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
          <div className="grid gap-4 rounded-[28px] border border-(--color-line) bg-[#fcfaf7] p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Suministros del inventario</p>
              <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                Agrega aqui los productos del inventario que normalmente usa este servicio.
              </p>
            </div>

            {products.length === 0 ? (
              <EmptyState>No hay productos en inventario para asociar como suministros.</EmptyState>
            ) : (
              <div className="grid gap-3">
                {Array.from({ length: componentSlots }, (_, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                    <Field label={`Suministro ${index + 1}`}>
                      <select name={`componentProductId_${index}`} className={inputClassName}>
                        <option value="">Sin producto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} · {product.unit.toLowerCase()} · costo unidad {formatMoney(product.costPrice)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cantidad usada">
                      <input
                        name={`componentQuantity_${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className={inputClassName}
                        placeholder="Cantidad"
                      />
                    </Field>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-muted)">Puedes dejar los suministros vacios si el servicio no consume inventario.</p>
            <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
