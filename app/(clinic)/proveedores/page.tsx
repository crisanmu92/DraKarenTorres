import { InventoryUnit, SaleItemType } from "@prisma/client";

import { createProduct, createSaleItem, createSupplier } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatMoney } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const inventoryUnitLabels: Record<InventoryUnit, string> = {
  UNIT: "Unidad",
  BOX: "Caja",
  VIAL: "Vial",
  SYRINGE: "Jeringa",
  ML: "Ml",
  MG: "Mg",
};

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  let suppliers: Array<{
    id: string;
    companyName: string;
    commercialAdvisor: string | null;
    phone: string | null;
  }> = [];
  let products: Array<{
    id: string;
    name: string;
    lotNumber: string;
    supplier: { companyName: string };
  }> = [];
  let saleItems: Array<{
    id: string;
    name: string;
    type: SaleItemType;
    unitPrice: unknown;
  }> = [];
  let pageError: string | null = null;

  try {
    [suppliers, products, saleItems] = await Promise.all([
      prisma.supplier.findMany({ orderBy: [{ createdAt: "desc" }], take: 10 }),
      prisma.product.findMany({
        include: { supplier: true },
        orderBy: [{ createdAt: "desc" }],
        take: 10,
      }),
      prisma.saleItem.findMany({
        include: { product: true },
        orderBy: [{ createdAt: "desc" }],
        take: 10,
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de proveedores y catalogo.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Abastecimiento"
        title="Proveedores, productos y catalogo"
        description="Aqui dejas lista la base maestra para operar ingresos e inventario."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <FormCard eyebrow="Proveedores" title="Agregar proveedor" description="Registra laboratorios o distribuidores.">
          <form action={createSupplier} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Empresa"><input name="companyName" className={inputClassName} required /></Field>
              <Field label="Asesor comercial"><input name="commercialAdvisor" className={inputClassName} /></Field>
              <Field label="Telefono"><input name="phone" className={inputClassName} /></Field>
              <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
            </div>
            <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
            <SubmitButton label="Guardar proveedor" pendingLabel="Guardando proveedor..." />
          </form>
          <div className="mt-6 grid gap-3">
            {suppliers.length === 0 ? <EmptyState>Aun no hay proveedores.</EmptyState> : suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="font-semibold text-(--color-ink)">{supplier.companyName}</p>
                <p className="mt-1 text-sm text-(--color-muted)">{supplier.commercialAdvisor ?? "Sin asesor"} · {supplier.phone ?? "Sin telefono"}</p>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard eyebrow="Productos" title="Agregar producto" description="Materia prima o productos fisicos con stock y lote.">
          <form action={createProduct} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
              <Field label="SKU"><input name="sku" className={inputClassName} /></Field>
              <Field label="Lote"><input name="lotNumber" className={inputClassName} required /></Field>
              <Field label="Stock actual"><input name="stockQuantity" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
              <Field label="Stock minimo"><input name="minStockQuantity" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
              <Field label="Unidad">
                <select name="unit" className={inputClassName} defaultValue="UNIT" required>
                  {Object.values(InventoryUnit).map((unit) => (
                    <option key={unit} value={unit}>{inventoryUnitLabels[unit]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Vence"><input name="expiresAt" type="date" className={inputClassName} /></Field>
              <Field label="Proveedor">
                <select name="supplierId" className={inputClassName} required>
                  <option value="">Selecciona un proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descripcion"><textarea name="description" className={textareaClassName} /></Field>
            <SubmitButton label="Guardar producto" pendingLabel="Guardando producto..." />
          </form>
          <div className="mt-6 grid gap-3">
            {products.length === 0 ? <EmptyState>Aun no hay productos.</EmptyState> : products.map((product) => (
              <div key={product.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="font-semibold text-(--color-ink)">{product.name}</p>
                <p className="mt-1 text-sm text-(--color-muted)">{product.supplier.companyName} · lote {product.lotNumber}</p>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard eyebrow="Catalogo" title="Agregar item de venta" description="Tratamientos o productos que generaran ingresos.">
          <form action={createSaleItem} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
              <Field label="Tipo">
                <select name="type" className={inputClassName} defaultValue="TREATMENT" required>
                  {Object.values(SaleItemType).map((type) => (
                    <option key={type} value={type}>{saleItemTypeLabels[type]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Precio"><input name="unitPrice" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
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
            <SubmitButton label="Guardar item" pendingLabel="Guardando item..." />
          </form>
          <div className="mt-6 grid gap-3">
            {saleItems.length === 0 ? <EmptyState>Aun no hay items de venta.</EmptyState> : saleItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="font-semibold text-(--color-ink)">{item.name}</p>
                <p className="mt-1 text-sm text-(--color-muted)">{saleItemTypeLabels[item.type]} · {formatMoney(item.unitPrice)}</p>
              </div>
            ))}
          </div>
        </FormCard>
      </div>
    </>
  );
}
