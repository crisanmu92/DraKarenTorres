"use client";

import { useMemo, useState } from "react";

import { inputClassName } from "@/components/clinic/ui";
import { formatMoney } from "@/lib/clinic-format";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
};

type ComponentValue = {
  productId: string;
  quantity: string;
};

type ServiceCostBuilderProps = {
  products: ProductOption[];
  unitPriceDefault?: string;
  baseCostDefault?: string;
  relatedProductIdDefault?: string;
  componentsDefault?: ComponentValue[];
  slots?: number;
};

export function ServiceCostBuilder({
  products,
  unitPriceDefault = "",
  baseCostDefault = "",
  relatedProductIdDefault = "",
  componentsDefault = [],
  slots = 5,
}: ServiceCostBuilderProps) {
  const [unitPrice, setUnitPrice] = useState(unitPriceDefault);
  const [baseCost, setBaseCost] = useState(baseCostDefault);
  const [relatedProductId, setRelatedProductId] = useState(relatedProductIdDefault);
  const [components, setComponents] = useState<ComponentValue[]>(
    Array.from({ length: slots }, (_, index) => componentsDefault[index] ?? { productId: "", quantity: "" }),
  );

  const inventoryCost = useMemo(() => {
    return components.reduce((sum, component) => {
      const product = products.find((item) => item.id === component.productId);
      const quantity = Number(component.quantity || 0);

      if (!product || Number.isNaN(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + product.costPrice * quantity;
    }, 0);
  }, [components, products]);

  const unitPriceNumber = Number(unitPrice || 0);
  const baseCostNumber = Number(baseCost || 0);
  const estimatedCost = inventoryCost > 0 ? inventoryCost : baseCostNumber;
  const estimatedProfit = unitPriceNumber - estimatedCost;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
              Cuanto cobras por este servicio
            </span>
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className={inputClassName}
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
              Costo base alterno
            </span>
            <input
              name="baseCost"
              type="number"
              step="0.01"
              min="0"
              value={baseCost}
              onChange={(event) => setBaseCost(event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="grid gap-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
              Producto relacionado
            </span>
            <select
              name="productId"
              value={relatedProductId}
              onChange={(event) => setRelatedProductId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Sin producto relacionado</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-[24px] border border-(--color-line) bg-[#fcfaf7] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Estimacion en vivo</p>
          <div className="mt-4 grid gap-3">
            <div>
              <p className="text-sm text-(--color-muted)">Costo estimado</p>
              <p className="mt-1 text-2xl font-semibold text-(--color-ink)">{formatMoney(estimatedCost)}</p>
            </div>
            <div>
              <p className="text-sm text-(--color-muted)">Utilidad estimada</p>
              <p className="mt-1 text-2xl font-semibold text-(--color-ink)">{formatMoney(estimatedProfit)}</p>
            </div>
            <p className="text-xs leading-5 text-(--color-muted)">
              Si agregas productos del inventario, esta estimacion usa esos insumos. Si no agregas productos, usa el costo base alterno.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Productos usados del inventario</p>
        {components.map((component, index) => {
          const selectedProduct = products.find((product) => product.id === component.productId);

          return (
            <div key={index} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <select
                name={`componentProductId_${index}`}
                value={component.productId}
                onChange={(event) =>
                  setComponents((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, productId: event.target.value } : item,
                    ),
                  )
                }
                className={inputClassName}
              >
                <option value="">Sin producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <input
                name={`componentQuantity_${index}`}
                type="number"
                step="0.01"
                min="0"
                value={component.quantity}
                onChange={(event) =>
                  setComponents((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, quantity: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Cantidad"
                className={inputClassName}
              />
              <div className="sm:col-span-2">
                <p className="text-xs leading-5 text-(--color-muted)">
                  {selectedProduct
                    ? `Costo unidad: ${formatMoney(selectedProduct.costPrice)} · unidad: ${selectedProduct.unit.toLowerCase()}`
                    : "Selecciona un producto para estimar el costo con inventario."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
