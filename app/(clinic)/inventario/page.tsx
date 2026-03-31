import Link from "next/link";
import { InventoryMovementType, InventoryUnit } from "@prisma/client";

import { EmptyState, FormCard, SectionHeading } from "@/components/clinic/ui";
import { formatMoney, toNumber } from "@/lib/clinic-format";
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

export default async function InventoryPage() {
  let products: Array<{
    id: string;
    name: string;
    description: string | null;
    costPrice: unknown;
    stockQuantity: unknown;
    unit: InventoryUnit;
    supplier: { id: string; companyName: string };
    inventoryMovements: Array<{
      type: InventoryMovementType;
      quantity: unknown;
    }>;
  }> = [];
  let pageError: string | null = null;

  try {
    products = await prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        costPrice: true,
        stockQuantity: true,
        unit: true,
        supplier: {
          select: {
            id: true,
            companyName: true,
          },
        },
        inventoryMovements: {
          where: { type: InventoryMovementType.PURCHASE },
          select: {
            type: true,
            quantity: true,
          },
        },
      },
    });
  } catch {
    pageError = "No se pudo cargar la informacion de inventario.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Inventario"
        title="Lista de productos"
        description="Aqui solo ves el stock actual de cada producto. Las compras se registran dentro de cada proveedor y cada uso o salida debe disminuir la cantidad actual."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <FormCard
        eyebrow="Existencias"
        title="Inventario actual"
        description="Consulta costo unitario, costo total, cantidad inicial comprada y cantidad actual disponible."
      >
        {products.length === 0 ? (
          <EmptyState>Aun no hay productos registrados en inventario.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-(--color-line)">
            <div className="hidden bg-[#f8f6f2] px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted) md:grid md:grid-cols-[minmax(220px,1.3fr)_minmax(160px,0.9fr)_minmax(120px,0.7fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)_minmax(150px,0.9fr)] md:gap-4">
              <p>Producto</p>
              <p>Proveedor</p>
              <p>Unidad</p>
              <p>Cantidad inicial</p>
              <p>Cantidad actual</p>
              <p>Costos</p>
            </div>
            <div className="divide-y divide-(--color-line)">
              {products.map((product) => {
                const initialQuantity = product.inventoryMovements.reduce(
                  (sum, movement) => sum + toNumber(movement.quantity),
                  0,
                );
                const currentQuantity = toNumber(product.stockQuantity);
                const unitCost = toNumber(product.costPrice);
                const totalCost = unitCost * currentQuantity;

                return (
                  <div key={product.id} className="bg-white">
                    <div className="grid gap-3 px-4 py-5 md:grid-cols-[minmax(220px,1.3fr)_minmax(160px,0.9fr)_minmax(120px,0.7fr)_minmax(150px,0.85fr)_minmax(150px,0.85fr)_minmax(150px,0.9fr)] md:items-center md:gap-4">
                      <div>
                        <p className="font-semibold text-(--color-ink)">{product.name}</p>
                        {product.description ? (
                          <p className="mt-1 text-sm text-(--color-muted)">{product.description}</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm text-(--color-ink)">{product.supplier.companyName}</p>
                        <Link
                          href={`/proveedores/${product.supplier.id}`}
                          className="mt-1 inline-flex text-sm font-semibold text-[#2f5be7]"
                        >
                          Ver proveedor
                        </Link>
                      </div>
                      <p className="text-sm text-(--color-ink)">{inventoryUnitLabels[product.unit]}</p>
                      <p className="text-sm font-semibold text-(--color-ink)">{initialQuantity}</p>
                      <p className="text-sm font-semibold text-(--color-ink)">{currentQuantity}</p>
                      <div>
                        <p className="text-sm font-semibold text-(--color-ink)">
                          {unitCost > 0 ? formatMoney(unitCost) : "Sin costo"}
                        </p>
                        <p className="mt-1 text-sm text-(--color-muted)">
                          Total actual: {unitCost > 0 ? formatMoney(totalCost) : "Sin calcular"}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 border-t border-(--color-line) bg-[#fcfaf7] px-4 py-3 text-sm text-(--color-muted) md:hidden">
                      <p>Proveedor: {product.supplier.companyName}</p>
                      <p>Unidad: {inventoryUnitLabels[product.unit]}</p>
                      <p>Cantidad inicial: {initialQuantity}</p>
                      <p>Cantidad actual: {currentQuantity}</p>
                      <p>Costo unidad: {unitCost > 0 ? formatMoney(unitCost) : "Sin costo"}</p>
                      <p>Costo total actual: {unitCost > 0 ? formatMoney(totalCost) : "Sin calcular"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </FormCard>
    </>
  );
}
