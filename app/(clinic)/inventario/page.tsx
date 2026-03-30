import { InventoryMovementType } from "@prisma/client";

import { createInventoryMovement } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
  EXPIRATION: "Vencimiento",
  RETURN: "Devolucion",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, sku: true },
    }),
    prisma.inventoryMovement.findMany({
      include: { product: true },
      orderBy: [{ occurredAt: "desc" }],
      take: 12,
    }),
  ]);

  return (
    <>
      <SectionHeading
        eyebrow="Inventario"
        title="Movimientos de inventario"
        description="Registra compras, salidas, ajustes, mermas y vencimientos de cada producto."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </>
  );
}
