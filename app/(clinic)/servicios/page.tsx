import Link from "next/link";
import { SaleItemType } from "@prisma/client";

import { deleteSaleItem, updateSaleItem } from "@/app/actions";
import { ServiceCostBuilder } from "@/components/clinic/service-cost-builder";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatMoney, toNumber } from "@/lib/clinic-format";
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
    unit: string;
    costPrice: number;
  }> = [];
  let saleItems: Array<{
    id: string;
    name: string;
    type: SaleItemType;
    description: string | null;
    unitPrice: unknown;
    baseCost: unknown;
    product: { id: string; name: string } | null;
    components: Array<{
      id: string;
      productId: string;
      quantity: unknown;
      product: { name: string; unit: string; costPrice: unknown };
    }>;
  }> = [];
  let pageError: string | null = null;

  try {
    [products, saleItems] = await Promise.all([
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, unit: true, costPrice: true },
      }),
      prisma.saleItem.findMany({
        include: {
          product: true,
          components: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true,
                  costPrice: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 24,
      }),
    ]).then(([productRows, serviceRows]) => [
      productRows.map((product) => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        costPrice: toNumber(product.costPrice),
      })),
      serviceRows,
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de servicios.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Servicios"
        title="Lista de servicios"
        description="Aqui ves los servicios configurados, su precio sugerido, el costo calculado con inventario y la utilidad estimada."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      <FormCard
        eyebrow="Catalogo"
        title="Servicios registrados"
        description="Crea nuevos servicios desde el boton y define que productos del inventario usa cada uno para calcular costos y utilidad."
      >
        <div className="mb-5 flex justify-end">
          <Link
            href="/servicios/nuevo"
            className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
          >
            Agregar servicio
          </Link>
        </div>

        <div className="grid gap-3">
          {saleItems.length === 0 ? (
            <EmptyState>Aun no hay servicios registrados.</EmptyState>
          ) : (
            saleItems.map((item) => {
              const inventoryCost = item.components.reduce(
                (sum, component) => sum + (toNumber(component.quantity) * toNumber(component.product.costPrice)),
                0,
              );
              const displayedCost = item.components.length > 0 ? inventoryCost : toNumber(item.baseCost);
              const estimatedProfit = toNumber(item.unitPrice) - displayedCost;

              return (
                <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{item.name}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {saleItemTypeLabels[item.type]} · cobro sugerido {formatMoney(item.unitPrice)}
                        {` · costo ${formatMoney(displayedCost)}`}
                        {` · utilidad ${formatMoney(estimatedProfit)}`}
                      </p>
                      {item.product ? (
                        <p className="mt-1 text-sm text-(--color-muted)">Producto relacionado: {item.product.name}</p>
                      ) : null}
                      {item.components.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.components.map((component) => (
                            <span
                              key={component.id}
                              className="rounded-full border border-(--color-line) bg-[#fcfaf7] px-3 py-1 text-xs font-semibold text-(--color-muted)"
                            >
                              {component.product.name} · {toNumber(component.quantity)} {component.product.unit.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-(--color-muted)">Sin productos del inventario asociados.</p>
                      )}
                    </div>
                  </div>

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
                        </div>
                        <Field label="Descripcion"><textarea name="description" defaultValue={item.description ?? ""} className={textareaClassName} /></Field>
                        <ServiceCostBuilder
                          products={products}
                          unitPriceDefault={String(item.unitPrice)}
                          baseCostDefault={item.baseCost == null ? "" : String(item.baseCost)}
                          relatedProductIdDefault={item.product?.id ?? ""}
                          componentsDefault={item.components.map((component) => ({
                            productId: component.productId,
                            quantity: String(component.quantity),
                          }))}
                        />
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteSaleItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <SubmitButton label="Eliminar servicio" pendingLabel="Eliminando..." variant="danger" />
                      </form>
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </div>
      </FormCard>
    </>
  );
}
