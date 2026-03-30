import { SaleItemType } from "@prisma/client";

import { createSaleItem, deleteSaleItem, updateSaleItem } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  formGridClassName,
  inputClassName,
  Notice,
  SectionHeading,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatMoney } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let products: Array<{
    id: string;
    name: string;
  }> = [];
  let saleItems: Array<{
    id: string;
    name: string;
    type: SaleItemType;
    description: string | null;
    unitPrice: unknown;
    product: { id: string; name: string } | null;
  }> = [];
  let pageError: string | null = null;

  try {
    [products, saleItems] = await Promise.all([
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.saleItem.findMany({
        include: { product: true },
        orderBy: [{ createdAt: "desc" }],
        take: 12,
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de servicios.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Servicios"
        title="Registro de servicios"
        description="Aqui configuras tratamientos, servicios y productos que luego generan ingresos."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo servicio"
          title="Agregar servicio"
          description="Crea el concepto que vas a cobrar y su precio."
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
              <Field label="Producto relacionado">
                <select name="productId" className={inputClassName} defaultValue="">
                  <option value="">Sin producto relacionado</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripcion"><textarea name="description" className={textareaClassName} /></Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">Cada servicio queda disponible al registrar ingresos.</p>
              <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Listado"
          title="Servicios recientes"
          description="Ultimos servicios o productos configurados para cobro."
        >
          <div className="grid gap-3">
            {saleItems.length === 0 ? (
              <EmptyState>Aun no hay servicios registrados.</EmptyState>
            ) : (
              saleItems.map((item) => (
                <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="font-semibold text-(--color-ink)">{item.name}</p>
                  <p className="mt-1 text-sm text-(--color-muted)">
                    {saleItemTypeLabels[item.type]} · {formatMoney(item.unitPrice)}
                    {item.product ? ` · ${item.product.name}` : ""}
                  </p>
                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
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
                          <Field label="Producto relacionado">
                            <select name="productId" defaultValue={item.product?.id ?? ""} className={inputClassName}>
                              <option value="">Sin producto relacionado</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Descripcion"><textarea name="description" defaultValue={item.description ?? ""} className={textareaClassName} /></Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteSaleItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <SubmitButton label="Eliminar servicio" pendingLabel="Eliminando..." variant="danger" />
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
