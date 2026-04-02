import {
  ExpenseCategory,
  InventoryMovementType,
  InventoryUnit,
  PaymentMethod,
  SaleItemType,
} from "@prisma/client";

import { getDashboardSummary, getMonthRange } from "@/lib/dashboard";
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

const sectionTitles = {
  all: "Exportacion completa del sistema",
  dashboard: "Dashboard",
  patients: "Pacientes",
  suppliers: "Proveedores",
  inventory: "Inventario",
  services: "Servicios",
  accountsReceivable: "Cuentas por cobrar",
  accountsPayable: "Cuentas por pagar",
  finances: "Finanzas",
  profitability: "Rentabilidad",
} as const;

type ExportSection = keyof typeof sectionTitles;

function getSection(raw: string | null): ExportSection {
  if (
    raw === "dashboard" ||
    raw === "patients" ||
    raw === "suppliers" ||
    raw === "inventory" ||
    raw === "services" ||
    raw === "accountsReceivable" ||
    raw === "accountsPayable" ||
    raw === "finances" ||
    raw === "profitability"
  ) {
    return raw;
  }

  return "all";
}

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

async function buildDashboardTables() {
  const { monthStart, nextMonthStart } = getMonthRange();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    summary,
    patientCount,
    recentRevenues,
    recentExpenses,
    upcomingFollowUps,
  ] = await Promise.all([
    getDashboardSummary(),
    prisma.patient.count(),
    prisma.revenue.findMany({
      orderBy: [{ occurredAt: "desc" }],
      take: 10,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        saleItem: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      orderBy: [{ occurredAt: "desc" }],
      take: 10,
    }),
    prisma.patientFollowUp.findMany({
      where: {
        nextFollowUpAt: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 1000 * 60 * 60 * 24 * 7),
        },
      },
      orderBy: [{ nextFollowUpAt: "asc" }],
      take: 10,
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const incomeToday = await prisma.revenue
    .findMany({
      where: { occurredAt: { gte: todayStart, lt: tomorrowStart } },
      select: { amount: true, discountAmount: true },
    })
    .then((rows) => rows.reduce((sum, row) => sum + getNetAmount(row.amount, row.discountAmount), 0));

  const expenseToday = await prisma.expense
    .aggregate({
      _sum: { amount: true },
      where: { occurredAt: { gte: todayStart, lt: tomorrowStart } },
    })
    .then((result) => toNumber(result._sum.amount));

  return [
    buildTable(
      "Resumen del dashboard",
      ["Indicador", "Valor"],
      [
        ["Pacientes registrados", patientCount],
        ["Ingresos del mes", summary.incomeMonthTotal],
        ["Egresos del mes", summary.expenseMonthTotal],
        ["Balance del mes", summary.balanceMonthTotal],
        ["Ingresos de hoy", incomeToday],
        ["Egresos de hoy", expenseToday],
        ["Seguimientos proximos 7 dias", upcomingFollowUps.length],
        ["Periodo actual", `${monthStart.toLocaleDateString("es-CO")} - ${nextMonthStart.toLocaleDateString("es-CO")}`],
      ],
    ),
    buildTable(
      "Ingresos recientes",
      ["Fecha", "Paciente", "Servicio", "Neto", "Costo", "Ganancia"],
      recentRevenues.map((revenue) => [
        formatDateCell(revenue.occurredAt),
        `${revenue.patient.firstName} ${revenue.patient.lastName}`,
        revenue.saleItem.name,
        getNetAmount(revenue.amount, revenue.discountAmount),
        toNumber(revenue.costAmount),
        getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount),
      ]),
    ),
    buildTable(
      "Egresos recientes",
      ["Fecha", "Descripcion", "Categoria", "Monto"],
      recentExpenses.map((expense) => [
        formatDateCell(expense.occurredAt),
        expense.description,
        expenseCategoryLabels[expense.category as ExpenseCategory],
        toNumber(expense.amount),
      ]),
    ),
    buildTable(
      "Seguimientos proximos",
      ["Paciente", "Ultimo control", "Proximo seguimiento", "Titulo"],
      upcomingFollowUps.map((followUp) => [
        `${followUp.patient.firstName} ${followUp.patient.lastName}`,
        formatDateCell(followUp.controlDate),
        formatDateCell(followUp.nextFollowUpAt),
        followUp.title,
      ]),
    ),
  ];
}

async function buildPatientsTables() {
  const [patients, followUps] = await Promise.all([
    prisma.patient.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.patientFollowUp.findMany({
      orderBy: [{ controlDate: "desc" }],
      include: {
        patient: { select: { firstName: true, lastName: true, identification: true } },
      },
    }),
  ]);

  return [
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
      "Seguimientos de pacientes",
      ["Paciente", "Identificacion", "Fecha control", "Titulo", "Notas", "Proximo seguimiento", "Foto antes", "Foto despues"],
      followUps.map((followUp) => [
        `${followUp.patient.firstName} ${followUp.patient.lastName}`,
        followUp.patient.identification,
        formatDateCell(followUp.controlDate),
        followUp.title,
        followUp.notes ?? "",
        formatDateCell(followUp.nextFollowUpAt),
        followUp.beforeImageUrl ?? "",
        followUp.afterImageUrl ?? "",
      ]),
    ),
  ];
}

async function buildSuppliersTables() {
  const [suppliers, payables] = await Promise.all([
    prisma.supplier.findMany({ orderBy: [{ createdAt: "desc" }] }),
    prisma.accountPayable.findMany({
      where: { supplierId: { not: null } },
      include: { supplier: true },
      orderBy: [{ debtDate: "desc" }],
    }),
  ]);

  return [
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
      "Cuentas por pagar a proveedores",
      ["Proveedor", "Concepto", "Monto", "Fecha deuda", "Proximo pago", "Fecha de pago", "Estado"],
      payables.map((item) => [
        item.supplier?.companyName ?? item.creditorName,
        item.description,
        toNumber(item.amount),
        formatDateCell(item.debtDate),
        formatDateCell(item.nextPaymentDate),
        formatDateCell(item.paidAt),
        item.isCompleted ? "Pagada" : "Pendiente",
      ]),
    ),
  ];
}

async function buildInventoryTables() {
  const [products, inventoryMovements] = await Promise.all([
    prisma.product.findMany({ include: { supplier: true }, orderBy: [{ createdAt: "desc" }] }),
    prisma.inventoryMovement.findMany({
      include: { product: true },
      orderBy: [{ occurredAt: "desc" }],
    }),
  ]);

  return [
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
}

async function buildServicesTables() {
  const [saleItems, components] = await Promise.all([
    prisma.saleItem.findMany({ include: { product: true }, orderBy: [{ createdAt: "desc" }] }),
    prisma.saleItemComponent.findMany({
      include: {
        saleItem: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: [{ saleItem: { name: "asc" } }],
    }),
  ]);

  return [
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
      "Componentes de servicios",
      ["Servicio", "Producto", "Cantidad"],
      components.map((component) => [
        component.saleItem.name,
        component.product.name,
        toNumber(component.quantity),
      ]),
    ),
  ];
}

async function buildAccountsReceivableTables() {
  const accounts = await prisma.accountReceivable.findMany({
    include: {
      patient: { select: { firstName: true, lastName: true } },
      saleItem: { select: { name: true } },
      payments: { select: { paidAt: true, amount: true, notes: true } },
    },
    orderBy: [{ isCompleted: "asc" }, { nextDueDate: "asc" }, { serviceDate: "desc" }],
  });

  const payments = accounts.flatMap((account) =>
    account.payments.map((payment) => ({
      patient: `${account.patient.firstName} ${account.patient.lastName}`,
      saleItem: account.saleItem.name,
      serviceDate: account.serviceDate,
      paidAt: payment.paidAt,
      amount: payment.amount,
      notes: payment.notes,
    })),
  );

  return [
    buildTable(
      "Cuentas por cobrar",
      ["Paciente", "Servicio", "Fecha servicio", "Total", "Cuotas", "Proximo cobro", "Estado", "Notas"],
      accounts.map((account) => [
        `${account.patient.firstName} ${account.patient.lastName}`,
        account.saleItem.name,
        formatDateCell(account.serviceDate),
        toNumber(account.totalAmount),
        account.financedInstallments,
        formatDateCell(account.nextDueDate),
        account.isCompleted ? "Completada" : "Activa",
        account.notes ?? "",
      ]),
    ),
    buildTable(
      "Pagos de cuentas por cobrar",
      ["Paciente", "Servicio", "Fecha servicio", "Fecha pago", "Valor", "Notas"],
      payments.map((payment) => [
        payment.patient,
        payment.saleItem,
        formatDateCell(payment.serviceDate),
        formatDateCell(payment.paidAt),
        toNumber(payment.amount),
        payment.notes ?? "",
      ]),
    ),
  ];
}

async function buildAccountsPayableTables() {
  const accounts = await prisma.accountPayable.findMany({
    include: { supplier: true },
    orderBy: [{ isCompleted: "asc" }, { nextPaymentDate: "asc" }, { debtDate: "desc" }],
  });

  return [
    buildTable(
      "Cuentas por pagar",
      ["Acreedor", "Proveedor", "Concepto", "Monto", "Fecha deuda", "Proximo pago", "Fecha pagada", "Estado", "Notas"],
      accounts.map((account) => [
        account.creditorName,
        account.supplier?.companyName ?? "",
        account.description,
        toNumber(account.amount),
        formatDateCell(account.debtDate),
        formatDateCell(account.nextPaymentDate),
        formatDateCell(account.paidAt),
        account.isCompleted ? "Pagada" : "Activa",
        account.notes ?? "",
      ]),
    ),
  ];
}

async function buildFinancesTables() {
  const [revenues, expenses, receivablePayments, payables] = await Promise.all([
    prisma.revenue.findMany({
      include: { patient: true, saleItem: true },
      orderBy: [{ occurredAt: "desc" }],
    }),
    prisma.expense.findMany({ orderBy: [{ occurredAt: "desc" }] }),
    prisma.accountReceivablePayment.findMany({
      include: {
        accountReceivable: {
          include: {
            patient: true,
            saleItem: true,
          },
        },
      },
      orderBy: [{ paidAt: "desc" }],
    }),
    prisma.accountPayable.findMany({
      include: { supplier: true },
      orderBy: [{ debtDate: "desc" }],
    }),
  ]);

  return [
    buildTable(
      "Servicios vendidos",
      ["Fecha", "Paciente", "Servicio", "Cobrado", "Descuento", "Neto", "Costo", "Ganancia", "Medio de pago"],
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
      ]),
    ),
    buildTable(
      "Cobros por cuentas por cobrar",
      ["Fecha", "Paciente", "Servicio", "Valor", "Notas"],
      receivablePayments.map((payment) => [
        formatDateCell(payment.paidAt),
        `${payment.accountReceivable.patient.firstName} ${payment.accountReceivable.patient.lastName}`,
        payment.accountReceivable.saleItem.name,
        toNumber(payment.amount),
        payment.notes ?? "",
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
      "Pagos y compras por pagar",
      ["Acreedor", "Proveedor", "Concepto", "Monto", "Fecha deuda", "Fecha pagada", "Estado"],
      payables.map((item) => [
        item.creditorName,
        item.supplier?.companyName ?? "",
        item.description,
        toNumber(item.amount),
        formatDateCell(item.debtDate),
        formatDateCell(item.paidAt),
        item.isCompleted ? "Pagada" : "Pendiente",
      ]),
    ),
  ];
}

async function buildProfitabilityTables() {
  const revenues = await prisma.revenue.findMany({
    include: {
      patient: { select: { firstName: true, lastName: true } },
      saleItem: { select: { name: true } },
    },
    orderBy: [{ occurredAt: "desc" }],
  });

  return [
    buildTable(
      "Rentabilidad por ingreso",
      ["Fecha", "Paciente", "Servicio", "Cobrado", "Descuento", "Neto", "Costo", "Ganancia"],
      revenues.map((revenue) => [
        formatDateCell(revenue.occurredAt),
        `${revenue.patient.firstName} ${revenue.patient.lastName}`,
        revenue.saleItem.name,
        toNumber(revenue.amount),
        toNumber(revenue.discountAmount),
        getNetAmount(revenue.amount, revenue.discountAmount),
        toNumber(revenue.costAmount),
        getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount),
      ]),
    ),
  ];
}

async function buildAllTables() {
  const tables = await Promise.all([
    buildPatientsTables(),
    buildSuppliersTables(),
    buildInventoryTables(),
    buildServicesTables(),
    buildAccountsReceivableTables(),
    buildAccountsPayableTables(),
    buildFinancesTables(),
    buildProfitabilityTables(),
  ]);

  return tables.flat();
}

async function getTablesForSection(section: ExportSection) {
  switch (section) {
    case "dashboard":
      return buildDashboardTables();
    case "patients":
      return buildPatientsTables();
    case "suppliers":
      return buildSuppliersTables();
    case "inventory":
      return buildInventoryTables();
    case "services":
      return buildServicesTables();
    case "accountsReceivable":
      return buildAccountsReceivableTables();
    case "accountsPayable":
      return buildAccountsPayableTables();
    case "finances":
      return buildFinancesTables();
    case "profitability":
      return buildProfitabilityTables();
    case "all":
    default:
      return buildAllTables();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = getSection(searchParams.get("section"));
  const tables = await getTablesForSection(section);
  const title = sectionTitles[section];
  const fileName = `dra-karen-torres-${section}.xls`;

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
        <h1>${escapeHtml(title)}</h1>
        <p>Generado: ${escapeHtml(new Date().toLocaleString("es-CO"))}</p>
        ${tables.join("")}
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
