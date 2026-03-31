import { ExpenseCategory, InventoryMovementType, InventoryUnit, PaymentMethod, SaleItemType } from "@prisma/client";

import { expenseCategoryLabels, getNetAmount, paymentMethodLabels, toNumber } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const inventoryUnitLabels: Record<InventoryUnit, string> = {
  UNIT: "Unidad",
  BOX: "Caja",
  VIAL: "Vial",
  SYRINGE: "Jeringa",
  ML: "Ml",
  MG: "Mg",
};

const inventoryMovementLabels: Record<InventoryMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  ADJUSTMENT: "Ajuste",
  WASTE: "Merma",
  EXPIRATION: "Vencimiento",
  RETURN: "Devolucion",
};

const saleItemTypeLabels: Record<SaleItemType, string> = {
  TREATMENT: "Tratamiento",
  PRODUCT: "Producto",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateCell(value: Date | null | undefined) {
  return value ? value.toLocaleString("es-CO") : "";
}

function buildTable(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const headerMarkup = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowMarkup = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `
    <table>
      <thead>
        <tr><th class="section-title" colspan="${headers.length}">${escapeHtml(title)}</th></tr>
        <tr>${headerMarkup}</tr>
      </thead>
      <tbody>${rowMarkup}</tbody>
    </table>
  `;
}

export async function GET() {
  const [patients, suppliers, products, saleItems, revenues, expenses, inventoryMovements] =
    await Promise.all([
      prisma.patient.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.supplier.findMany({ orderBy: [{ createdAt: "desc" }] }),
      prisma.product.findMany({ include: { supplier: true }, orderBy: [{ createdAt: "desc" }] }),
      prisma.saleItem.findMany({ include: { product: true }, orderBy: [{ createdAt: "desc" }] }),
      prisma.revenue.findMany({
        include: { patient: true, saleItem: true },
        orderBy: [{ occurredAt: "desc" }],
      }),
      prisma.expense.findMany({ orderBy: [{ occurredAt: "desc" }] }),
      prisma.inventoryMovement.findMany({
        include: { product: true },
        orderBy: [{ occurredAt: "desc" }],
      }),
    ]);

  const tables = [
    buildTable(
      "Pacientes",
      [
        "Nombres",
        "Apellidos",
        "Identificacion",
        "Telefono",
        "Correo",
        "Nacimiento",
        "Alergias",
        "Historial",
        "Notas",
        "Ultima visita",
        "Proximo seguimiento",
        "Creado",
      ],
      patients.map((patient) => [
        patient.firstName,
        patient.lastName,
        patient.identification,
        patient.phone,
        patient.email ?? "",
        formatDateCell(patient.birthDate),
        patient.allergies ?? "",
        patient.previousTreatments ?? "",
        patient.importantNotes ?? "",
        formatDateCell(patient.lastVisitAt),
        formatDateCell(patient.nextVisitAt),
        formatDateCell(patient.createdAt),
      ]),
    ),
    buildTable(
      "Proveedores",
      ["Empresa", "Asesor", "Telefono", "Correo", "Notas", "Creado"],
      suppliers.map((supplier) => [
        supplier.companyName,
        supplier.commercialAdvisor ?? "",
        supplier.phone ?? "",
        supplier.email ?? "",
        supplier.notes ?? "",
        formatDateCell(supplier.createdAt),
      ]),
    ),
    buildTable(
      "Inventario",
      [
        "Producto",
        "SKU",
        "Lote",
        "Costo unitario",
        "Stock",
        "Stock minimo",
        "Unidad",
        "Vence",
        "Activo",
        "Proveedor",
      ],
      products.map((product) => [
        product.name,
        product.sku ?? "",
        product.lotNumber,
        toNumber(product.costPrice),
        toNumber(product.stockQuantity),
        toNumber(product.minStockQuantity),
        inventoryUnitLabels[product.unit],
        formatDateCell(product.expiresAt),
        product.isActive ? "Si" : "No",
        product.supplier.companyName,
      ]),
    ),
    buildTable(
      "Servicios",
      ["Nombre", "Tipo", "Precio", "Costo base", "Producto relacionado", "Activo", "Descripcion"],
      saleItems.map((saleItem) => [
        saleItem.name,
        saleItemTypeLabels[saleItem.type],
        toNumber(saleItem.unitPrice),
        toNumber(saleItem.baseCost),
        saleItem.product?.name ?? "",
        saleItem.isActive ? "Si" : "No",
        saleItem.description ?? "",
      ]),
    ),
    buildTable(
      "Ingresos",
      ["Fecha", "Cliente", "Servicio", "Cobrado", "Descuento", "Neto", "Costo", "Ganancia", "Medio de pago", "Notas"],
      revenues.map((revenue) => [
        formatDateCell(revenue.occurredAt),
        `${revenue.patient.firstName} ${revenue.patient.lastName}`,
        revenue.saleItem.name,
        toNumber(revenue.amount),
        toNumber(revenue.discountAmount),
        getNetAmount(revenue.amount, revenue.discountAmount),
        toNumber(revenue.costAmount),
        getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount),
        paymentMethodLabels[revenue.paymentMethod as PaymentMethod],
        revenue.notes ?? "",
      ]),
    ),
    buildTable(
      "Egresos",
      ["Fecha", "Categoria", "Descripcion", "Monto", "Notas"],
      expenses.map((expense) => [
        formatDateCell(expense.occurredAt),
        expenseCategoryLabels[expense.category as ExpenseCategory],
        expense.description,
        toNumber(expense.amount),
        expense.notes ?? "",
      ]),
    ),
    buildTable(
      "Movimientos de inventario",
      ["Fecha", "Producto", "Tipo", "Cantidad", "Motivo"],
      inventoryMovements.map((movement) => [
        formatDateCell(movement.occurredAt),
        movement.product.name,
        inventoryMovementLabels[movement.type],
        toNumber(movement.quantity),
        movement.reason ?? "",
      ]),
    ),
  ];

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; margin-bottom: 28px; width: 100%; }
          th, td { border: 1px solid #d8d8d8; padding: 8px 10px; font-size: 12px; text-align: left; }
          thead th { background: #efe2d1; }
          .section-title { background: #d7c0a4; font-size: 14px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Exportacion completa del sistema</h1>
        <p>Generado: ${escapeHtml(new Date().toLocaleString("es-CO"))}</p>
        ${tables.join("")}
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": 'attachment; filename="panel-privado.xls"',
      "Cache-Control": "no-store",
    },
  });
}
