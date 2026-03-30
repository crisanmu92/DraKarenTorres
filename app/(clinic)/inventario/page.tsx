import { InventoryMovementType, InventoryUnit } from "@prisma/client";

import { createInventoryMovement, createProduct, deleteInventoryMovement, updateInventoryMovement } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, sectionCardClassName, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, formatDateTimeInput, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
  EXPIRATION: "Vencimiento",
  RETURN: "Devolucion",
};

const inventoryUnitLabels: Record<InventoryUnit, string> = {
  UNIT: "Unidad",
  BOX: "Caja",
  VIAL: "Vial",
  SYRINGE: "Jeringa",
  ML: "Ml",
  MG: "Mg",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ supplierId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedSupplierId = resolvedSearchParams?.supplierId ?? "";
  let suppliers: Array<{
    id: string;
    companyName: string;
  }> = [];
  let products: Array<{
    id: string;
    name: string;
    sku: string | null;
    supplier: { companyName: string };
  }> = [];
  let movements: Array<{
    id: string;
    occurredAt: Date;
    type: InventoryMovementType;
    quantity: unknown;
    reason: string | null;
    productId: string;
    product: { name: string };
  }> = [];
  let pageError: string | null = null;

  try {
    [suppliers, products, movements] = await Promise.all([
      prisma.supplier.findMany({
        orderBy: [{ companyName: "asc" }],
        select: { id: true, companyName: true },
      }),
      prisma.product.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, sku: true, supplier: { select: { companyName: true } } },
      }),
      prisma.inventoryMovement.findMany({
        include: { product: true },
        orderBy: [{ occurredAt: "desc" }],
        take: 12,
      }),
    ]);
  } catch {
    pageError = "No se pudo cargar la informacion de inventario.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Inventario"
        title="Compras e inventario"
        description="Primero registra lo que le compraste a un proveedor y luego controla las entradas, salidas y ajustes del inventario."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Compra nueva"
          title="Agregar producto comprado"
          description="Selecciona el proveedor y registra el producto o insumo que acabas de comprar."
        >
          <form action={createProduct} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Proveedor">
                <select name="supplierId" className={inputClassName} defaultValue={selectedSupplierId} required>
                  <option value="">Selecciona un proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nombre"><input name="name" className={inputClassName} required /></Field>
              <Field label="SKU"><input name="sku" className={inputClassName} /></Field>
              <Field label="Lote"><input name="lotNumber" className={inputClassName} required /></Field>
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">Una vez guardado el producto, ya puedes moverlo dentro del inventario.</p>
              <SubmitButton label="Guardar compra" pendingLabel="Guardando compra..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Nuevo movimiento"
          title="Registrar movimiento"
          description="Registra una linea por cada entrada o salida relevante."
        >
          <form action={createInventoryMovement} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
              <Field label="Tipo">
                <select name="type" className={inputClassName} defaultValue="PURCHASE" required>
                  {Object.values(InventoryMovementType).map((type) => (
                    <option key={type} value={type}>{inventoryMovementLabels[type]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Producto">
                <select name="productId" className={inputClassName} required>
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}{product.sku ? ` · ${product.sku}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad"><input name="quantity" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
            </div>
            <Field label="Motivo o detalle"><textarea name="reason" className={textareaClassName} /></Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">Cada movimiento queda ligado a un producto especifico.</p>
              <SubmitButton label="Registrar movimiento" pendingLabel="Guardando movimiento..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Actividad reciente"
          title="Ultimos movimientos"
          description="Consulta rapida de entradas, salidas o ajustes recientes."
        >
          <div className="grid gap-3">
            {movements.length === 0 ? (
              <EmptyState>Aun no hay movimientos de inventario registrados.</EmptyState>
            ) : (
              movements.map((movement) => (
                <div key={movement.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{movement.product.name}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">{inventoryMovementLabels[movement.type]}</p>
                    </div>
                    <p className="text-sm font-semibold text-(--color-ink)">{toNumber(movement.quantity)}</p>
                  </div>
                  <p className="mt-2 text-sm text-(--color-muted)">{formatDate(movement.occurredAt)}</p>
                  <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                      Editar o eliminar
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <form action={updateInventoryMovement} className="grid gap-4">
                        <input type="hidden" name="id" value={movement.id} />
                        <div className={formGridClassName}>
                          <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(movement.occurredAt)} className={inputClassName} /></Field>
                          <Field label="Tipo">
                            <select name="type" defaultValue={movement.type} className={inputClassName} required>
                              {Object.values(InventoryMovementType).map((type) => (
                                <option key={type} value={type}>{inventoryMovementLabels[type]}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Producto">
                            <select name="productId" defaultValue={movement.productId} className={inputClassName} required>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}{product.sku ? ` · ${product.sku}` : ""}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Cantidad"><input name="quantity" type="number" step="0.01" min="0" defaultValue={String(movement.quantity)} className={inputClassName} required /></Field>
                        </div>
                        <Field label="Motivo o detalle"><textarea name="reason" defaultValue={movement.reason ?? ""} className={textareaClassName} /></Field>
                        <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                      </form>
                      <form action={deleteInventoryMovement}>
                        <input type="hidden" name="id" value={movement.id} />
                        <SubmitButton label="Eliminar movimiento" pendingLabel="Eliminando..." variant="danger" />
                      </form>
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>

      <article className={sectionCardClassName}>
        <SectionHeading
          eyebrow="Productos comprados"
          title="Base actual de productos"
          description="Los productos ya comprados quedan enlazados a su proveedor para poder moverlos despues en inventario."
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {products.length === 0 ? (
            <EmptyState>Aun no hay productos registrados.</EmptyState>
          ) : (
            products.map((product) => (
              <div key={product.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="font-semibold text-(--color-ink)">{product.name}</p>
                <p className="mt-1 text-sm text-(--color-muted)">
                  {product.supplier.companyName}{product.sku ? ` · ${product.sku}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </article>
    </>
  );
}
