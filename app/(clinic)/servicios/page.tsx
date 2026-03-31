import Link from "next/link";
import { SaleItemType } from "@prisma/client";

import { deleteSaleItem, updateSaleItem } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
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

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let saleItems: Array<{
    id: string;
    name: string;
    type: SaleItemType;
    unitPrice: unknown;
    components: Array<{
      productId: string;
      quantity: unknown;
    }>;
  }> = [];
  let products: Array<{
    id: string;
    name: string;
    unit: string;
    costPrice: unknown;
  }> = [];
  let pageError: string | null = null;

  try {
    [saleItems, products] = await Promise.all([
      prisma.saleItem.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 40,
        select: {
          id: true,
          name: true,
          type: true,
          unitPrice: true,
          components: {
            select: {
              productId: true,
              quantity: true,
            },
            orderBy: [{ createdAt: "asc" }],
          },
        },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          unit: true,
          costPrice: true,
        },
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de servicios.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Servicios"
        title="Lista de servicios"
        description="Aqui solo ves la lista de servicios registrados y puedes agregar nuevos desde el boton."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <FormCard
        eyebrow="Catalogo"
        title="Servicios registrados"
        description="Usa el boton para agregar servicios nuevos. En esta vista solo aparece la lista."
      >
        <div className="mb-5 flex justify-end">
          <Link
            href="/servicios/nuevo"
            className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Agregar servicio
          </Link>
        </div>

        {saleItems.length === 0 ? (
          <EmptyState>Aun no hay servicios registrados.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-(--color-line)">
            <div className="hidden bg-[#f8f6f2] px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted) md:grid md:grid-cols-[minmax(220px,1.3fr)_minmax(160px,0.9fr)_minmax(170px,0.9fr)_180px] md:gap-4">
              <p>Nombre</p>
              <p>Tipo</p>
              <p>Precio</p>
              <p>Acciones</p>
            </div>
            <div className="divide-y divide-(--color-line)">
              {saleItems.map((item) => (
                <div key={item.id} className="bg-white">
                  <div className="grid gap-3 px-4 py-5 md:grid-cols-[minmax(220px,1.3fr)_minmax(160px,0.9fr)_minmax(170px,0.9fr)_180px] md:items-center md:gap-4">
                    <p className="font-semibold text-(--color-ink)">{item.name}</p>
                    <p className="text-sm text-(--color-ink)">{saleItemTypeLabels[item.type]}</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{formatMoney(item.unitPrice)}</p>
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-full border border-(--color-line) bg-[#fcfaf7] px-4 py-3 text-sm font-semibold text-(--color-ink)">
                        Editar o eliminar
                      </summary>
                      <div className="absolute right-0 z-10 mt-3 w-[min(92vw,34rem)] rounded-[28px] border border-(--color-line) bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
                        <div className="grid gap-4">
                          <form action={updateSaleItem} className="grid gap-4">
                            <input type="hidden" name="id" value={item.id} />
                            <div className={formGridClassName}>
                              <Field label="Nombre"><input name="name" defaultValue={item.name} className={inputClassName} required /></Field>
                              <Field label="Tipo">
                                <select name="type" defaultValue={item.type} className={inputClassName} required>
                                  {Object.values(SaleItemType).map((type) => (
                                    <option key={type} value={type}>{saleItemTypeLabels[type]}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Precio">
                                <input name="unitPrice" type="number" step="0.01" min="0" defaultValue={String(item.unitPrice)} className={inputClassName} required />
                              </Field>
                            </div>
                            <div className="grid gap-4 rounded-[28px] border border-(--color-line) bg-[#fcfaf7] p-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Suministros del inventario</p>
                                <p className="mt-2 text-sm leading-6 text-(--color-muted)">
                                  Puedes asociar hasta {componentSlots} productos del inventario a este servicio.
                                </p>
                              </div>
                              <div className="grid gap-3">
                                {Array.from({ length: componentSlots }, (_, index) => {
                                  const component = item.components[index];

                                  return (
                                    <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                                      <Field label={`Suministro ${index + 1}`}>
                                        <select
                                          name={`componentProductId_${index}`}
                                          defaultValue={component?.productId ?? ""}
                                          className={inputClassName}
                                        >
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
                                          defaultValue={component ? String(component.quantity) : ""}
                                          className={inputClassName}
                                          placeholder="Cantidad"
                                        />
                                      </Field>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                          </form>
                          <form action={deleteSaleItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <SubmitButton label="Eliminar servicio" pendingLabel="Eliminando..." variant="danger" />
                          </form>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </FormCard>
    </>
  );
}
