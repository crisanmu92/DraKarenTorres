import Link from "next/link";
import { InventoryUnit } from "@prisma/client";

import { createProduct, deleteProduct, updateProduct } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  SectionHeading,
  formGridClassName,
  inputClassName,
  sectionCardClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatMoney, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const inventoryUnitLabels: Record<InventoryUnit, string> = {
  UNIT: "Unidad",
  BOX: "Caja",
  VIAL: "Vial",
  SYRINGE: "Jeringa",
  ML: "Ml",
  MG: "Mg",
};

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let supplier: {
    id: string;
    companyName: string;
    commercialAdvisor: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    products: Array<{
      id: string;
      name: string;
      description: string | null;
      costPrice: unknown;
      stockQuantity: unknown;
      unit: InventoryUnit;
      expiresAt: Date | null;
      isActive: boolean;
    }>;
  } | null = null;
  let pageError: string | null = null;

  try {
    supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        commercialAdvisor: true,
        phone: true,
        email: true,
        notes: true,
        products: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            description: true,
            costPrice: true,
            stockQuantity: true,
            unit: true,
            expiresAt: true,
            isActive: true,
          },
        },
      },
    });
  } catch {
    pageError = "No se pudo cargar la ficha del proveedor.";
  }

  if (!supplier && !pageError) {
    pageError = "No se encontro el proveedor solicitado.";
  }

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
        eyebrow="Proveedor"
        title={supplier?.companyName ?? "Ficha del proveedor"}
        description="Desde esta ficha puedes registrar cada compra del proveedor. Cada producto nuevo se agrega automaticamente al inventario con su movimiento inicial."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      {supplier ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-4">
            <article className={sectionCardClassName}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Empresa</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{supplier.companyName}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Asesor</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{supplier.commercialAdvisor ?? "Sin asesor"}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Telefono</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{supplier.phone ?? "Sin telefono"}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Correo</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{supplier.email ?? "Sin correo"}</p>
                </div>
                <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Notas</p>
                  <p className="mt-2 font-semibold text-(--color-ink)">{supplier.notes ?? "Sin notas"}</p>
                </div>
              </div>
            </article>

            <FormCard
              eyebrow="Compras"
              title="Agregar producto al proveedor"
              description="Registra la presentacion exacta que compras. Ejemplos: jeringa 1 ml, jeringa 3 ml, acido hialuronico 1 ml, lidocaina 30 g."
            >
              <form action={createProduct} className="grid gap-4">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                <div className={formGridClassName}>
                  <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
                  <Field label="Unidad" hint="Usa Jeringa, Ml, Mg, Caja, Vial o Unidad segun la compra.">
                    <select name="unit" className={inputClassName} defaultValue="UNIT" required>
                      {Object.values(InventoryUnit).map((unit) => (
                        <option key={unit} value={unit}>
                          {inventoryUnitLabels[unit]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cantidad comprada" hint="Si compras una caja, pon aqui cuantas unidades, ml o mg trae en total.">
                    <input name="stockQuantity" type="number" step="0.01" min="0.01" className={inputClassName} required />
                  </Field>
                  <Field label="Valor total pagado" hint="El sistema calcula el costo unitario automaticamente con base en la cantidad.">
                    <input name="totalPurchaseAmount" type="number" step="0.01" min="0" className={inputClassName} required />
                  </Field>
                  <Field label="Vence"><input name="expiresAt" type="date" className={inputClassName} /></Field>
                </div>
                <Field label="Descripcion" hint="Aqui puedes dejar el peso, los ml, la referencia o cualquier detalle adicional de la presentacion.">
                  <textarea name="description" className={textareaClassName} />
                </Field>
                <SubmitButton label="Guardar compra" pendingLabel="Guardando compra..." />
              </form>
            </FormCard>
          </div>

          <FormCard
            eyebrow="Inventario"
            title="Productos comprados a este proveedor"
            description="Cada registro ya queda dentro del inventario y genera automaticamente una compra inicial en movimientos."
          >
            <div className="grid gap-3">
              {supplier.products.length === 0 ? (
                <EmptyState>Aun no hay compras registradas para este proveedor.</EmptyState>
              ) : (
                supplier.products.map((product) => (
                  <div key={product.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-(--color-ink)">{product.name}</p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {inventoryUnitLabels[product.unit]} · cantidad {toNumber(product.stockQuantity)}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {toNumber(product.costPrice) > 0 ? `Costo unitario ${formatMoney(product.costPrice)}` : "Costo unitario sin registrar"}
                          {toNumber(product.costPrice) > 0 ? ` · Valor total ${formatMoney(toNumber(product.costPrice) * toNumber(product.stockQuantity))}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          {product.expiresAt ? `Vence ${formatDate(product.expiresAt)}` : "Sin fecha de vencimiento"}
                        </p>
                        {product.description ? (
                          <p className="mt-2 text-sm leading-6 text-(--color-muted)">{product.description}</p>
                        ) : null}
                      </div>
                      <Link
                        href="/inventario"
                        className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-(--color-ink)"
                      >
                        Ver inventario
                      </Link>
                    </div>

                    <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                        Editar o eliminar
                      </summary>
                      <div className="mt-4 grid gap-4">
                        <form action={updateProduct} className="grid gap-4">
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                          <div className={formGridClassName}>
                            <Field label="Nombre"><input name="name" defaultValue={product.name} className={inputClassName} required /></Field>
                            <Field label="Unidad">
                              <select name="unit" defaultValue={product.unit} className={inputClassName} required>
                                {Object.values(InventoryUnit).map((unit) => (
                                  <option key={unit} value={unit}>
                                    {inventoryUnitLabels[unit]}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Cantidad actual"><input name="stockQuantity" type="number" step="0.01" min="0.01" defaultValue={toNumber(product.stockQuantity)} className={inputClassName} required /></Field>
                            <Field label="Valor total" hint="El sistema vuelve a calcular el costo unitario con esta cantidad y este valor total.">
                              <input
                                name="totalPurchaseAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={toNumber(product.costPrice) > 0 ? (toNumber(product.costPrice) * toNumber(product.stockQuantity)).toFixed(2) : ""}
                                className={inputClassName}
                                required
                              />
                            </Field>
                            <Field label="Vence"><input name="expiresAt" type="date" defaultValue={product.expiresAt ? product.expiresAt.toISOString().slice(0, 10) : ""} className={inputClassName} /></Field>
                          </div>
                          <Field label="Descripcion"><textarea name="description" defaultValue={product.description ?? ""} className={textareaClassName} /></Field>
                          <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                        </form>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                          <SubmitButton label="Eliminar producto" pendingLabel="Eliminando..." variant="danger" />
                        </form>
                      </div>
                    </details>
                  </div>
                ))
              )}
            </div>
          </FormCard>
        </div>
      ) : null}
    </>
  );
}
