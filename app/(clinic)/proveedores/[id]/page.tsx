import Link from "next/link";
import { InventoryUnit } from "@prisma/client";

import { createProduct, deleteProduct, updateProduct } from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  formGridClassName,
  inputClassName,
  SectionHeading,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDateInput, formatMoney } from "@/lib/clinic-format";
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
  } | null = null;
  let products: Array<{
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    lotNumber: string;
    costPrice: unknown;
    stockQuantity: unknown;
    minStockQuantity: unknown;
    unit: InventoryUnit;
    expiresAt: Date | null;
    isActive: boolean;
    supplierId: string;
  }> = [];
  let pageError: string | null = null;

  try {
    [supplier, products] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id },
        select: {
          id: true,
          companyName: true,
          commercialAdvisor: true,
          phone: true,
          email: true,
          notes: true,
        },
      }),
      prisma.product.findMany({
        where: { supplierId: id },
        orderBy: [{ createdAt: "desc" }],
        take: 24,
      }),
    ]);
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
        description="Dentro de esta ficha registras las compras hechas a este proveedor y mantienes el historial de productos asociados."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      {supplier ? (
        <>
          <FormCard
            eyebrow="Datos del proveedor"
            title="Informacion general"
            description="Referencia rapida del contacto y notas del proveedor."
          >
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Notas</p>
                <p className="mt-2 font-semibold text-(--color-ink)">{supplier.notes ?? "Sin notas"}</p>
              </div>
            </div>
          </FormCard>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <FormCard
              eyebrow="Compra nueva"
              title="Agregar producto comprado"
              description="Registra aqui directamente lo que le compraste a este proveedor."
            >
              <form action={createProduct} className="grid gap-4">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                <div className={formGridClassName}>
                  <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
                  <Field label="SKU"><input name="sku" className={inputClassName} /></Field>
                  <Field label="Lote"><input name="lotNumber" className={inputClassName} required /></Field>
                  <Field label="Costo unitario"><input name="costPrice" type="number" step="0.01" min="0" className={inputClassName} /></Field>
                  <Field label="Cantidad comprada"><input name="stockQuantity" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
                  <Field label="Stock minimo"><input name="minStockQuantity" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
                  <Field label="Unidad">
                    <select name="unit" className={inputClassName} defaultValue="UNIT" required>
                      {Object.values(InventoryUnit).map((unit) => (
                        <option key={unit} value={unit}>{inventoryUnitLabels[unit]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vence"><input name="expiresAt" type="date" className={inputClassName} /></Field>
                </div>
                <Field label="Descripcion"><textarea name="description" className={textareaClassName} /></Field>
                <SubmitButton label="Guardar compra" pendingLabel="Guardando compra..." />
              </form>
            </FormCard>

            <FormCard
              eyebrow="Compras registradas"
              title="Productos de este proveedor"
              description="Historial actual de productos e insumos comprados a este proveedor."
            >
              <div className="grid gap-3">
                {products.length === 0 ? (
                  <EmptyState>Aun no hay compras registradas para este proveedor.</EmptyState>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                      <p className="font-semibold text-(--color-ink)">{product.name}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {product.sku ?? "Sin SKU"} · lote {product.lotNumber}
                      </p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        Costo: {product.costPrice ? formatMoney(product.costPrice) : "Sin registrar"} · Stock: {String(product.stockQuantity)}
                      </p>
                      <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                        <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                          Editar o eliminar compra
                        </summary>
                        <div className="mt-4 grid gap-4">
                          <form action={updateProduct} className="grid gap-4">
                            <input type="hidden" name="id" value={product.id} />
                            <input type="hidden" name="supplierId" value={supplier.id} />
                            <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                            <div className={formGridClassName}>
                              <Field label="Nombre"><input name="name" defaultValue={product.name} className={inputClassName} required /></Field>
                              <Field label="SKU"><input name="sku" defaultValue={product.sku ?? ""} className={inputClassName} /></Field>
                              <Field label="Lote"><input name="lotNumber" defaultValue={product.lotNumber} className={inputClassName} required /></Field>
                              <Field label="Costo unitario"><input name="costPrice" type="number" step="0.01" min="0" defaultValue={product.costPrice == null ? "" : String(product.costPrice)} className={inputClassName} /></Field>
                              <Field label="Stock actual"><input name="stockQuantity" type="number" step="0.01" min="0" defaultValue={String(product.stockQuantity)} className={inputClassName} required /></Field>
                              <Field label="Stock minimo"><input name="minStockQuantity" type="number" step="0.01" min="0" defaultValue={String(product.minStockQuantity)} className={inputClassName} required /></Field>
                              <Field label="Unidad">
                                <select name="unit" defaultValue={product.unit} className={inputClassName} required>
                                  {Object.values(InventoryUnit).map((unit) => (
                                    <option key={unit} value={unit}>{inventoryUnitLabels[unit]}</option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="Vence"><input name="expiresAt" type="date" defaultValue={formatDateInput(product.expiresAt)} className={inputClassName} /></Field>
                              <Field label="Activo">
                                <select name="isActive" defaultValue={product.isActive ? "true" : "false"} className={inputClassName} required>
                                  <option value="true">Si</option>
                                  <option value="false">No</option>
                                </select>
                              </Field>
                            </div>
                            <Field label="Descripcion"><textarea name="description" defaultValue={product.description ?? ""} className={textareaClassName} /></Field>
                            <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                          </form>
                          <form action={deleteProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <input type="hidden" name="redirectTo" value={`/proveedores/${supplier.id}`} />
                            <SubmitButton label="Eliminar compra" pendingLabel="Eliminando..." variant="danger" />
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
      ) : null}
    </>
  );
}
