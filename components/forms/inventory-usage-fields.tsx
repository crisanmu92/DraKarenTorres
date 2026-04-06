"use client";

import { useState } from "react";

import { EmptyState, Field, inputClassName } from "@/components/clinic/ui";
import { formatMoney } from "@/lib/clinic-format";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  costPrice: unknown;
};

type InventoryUsageValue = {
  productId: string;
  quantity: string;
};

type InventoryUsageFieldsProps = {
  products: ProductOption[];
  initialValues?: InventoryUsageValue[];
  initialRows?: number;
  title: string;
  description: string;
};

export function InventoryUsageFields({
  products,
  initialValues = [],
  initialRows = 5,
  title,
  description,
}: InventoryUsageFieldsProps) {
  const startingRows = Math.max(initialRows, initialValues.length || 0);
  const [rows, setRows] = useState<InventoryUsageValue[]>(
    Array.from({ length: startingRows }, (_, index) => initialValues[index] ?? { productId: "", quantity: "" }),
  );

  if (products.length === 0) {
    return <EmptyState>No hay productos en inventario para registrar como suministros.</EmptyState>;
  }

  return (
    <div className="grid gap-4 rounded-[28px] border border-(--color-line) bg-[#fcfaf7] p-4">
      <input type="hidden" name="componentCount" value={rows.length} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">{title}</p>
          <p className="mt-2 text-sm leading-6 text-(--color-muted)">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { productId: "", quantity: "" }])}
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Agregar suministro
        </button>
      </div>

      <div className="grid gap-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-3xl border border-(--color-line) bg-white p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <Field label={`Suministro ${index + 1}`}>
              <select
                name={`componentProductId_${index}`}
                value={row.productId}
                onChange={(event) =>
                  setRows((current) =>
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
                value={row.quantity}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, quantity: event.target.value } : item,
                    ),
                  )
                }
                className={inputClassName}
                placeholder="Cantidad"
              />
            </Field>

            <button
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.length === 1 ? [{ productId: "", quantity: "" }] : current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#ffd4d1] bg-[#fff0ef] px-4 text-sm font-semibold text-[#b42318]"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
