import {
  ExpenseCategory,
  InventoryMovementType,
  InventoryUnit,
  PaymentMethod,
  Prisma,
  PrismaClient,
  SaleItemType,
} from "@prisma/client";

const prisma = new PrismaClient();

const decimal = (value: number) => new Prisma.Decimal(value);

async function upsertSupplier(data: {
  companyName: string;
  commercialAdvisor?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const existing = await prisma.supplier.findFirst({
    where: { companyName: data.companyName },
  });

  if (existing) {
    return prisma.supplier.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.supplier.create({ data });
}

async function upsertSaleItemByName(data: {
  name: string;
  type: SaleItemType;
  description?: string;
  unitPrice: Prisma.Decimal;
  productId?: string;
}) {
  const existing = await prisma.saleItem.findFirst({
    where: { name: data.name, type: data.type },
  });

  if (existing) {
    return prisma.saleItem.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.saleItem.create({ data });
}

async function main() {
  const [allergan, bioinsumos] = await Promise.all([
    upsertSupplier({
      companyName: "Allergan Aesthetics Colombia",
      commercialAdvisor: "Laura Mendoza",
      phone: "+57 300 123 4567",
      email: "laura.mendoza@allergan-demo.co",
      notes: "Proveedor de toxina botulinica y rellenos premium.",
    }),
    upsertSupplier({
      companyName: "Bioinsumos Medicos SAS",
      commercialAdvisor: "Camilo Rojas",
      phone: "+57 310 555 0198",
      email: "camilo.rojas@bioinsumos-demo.co",
      notes: "Distribucion de jeringas, agujas e insumos de apoyo.",
    }),
  ]);

  const productBotox = await prisma.product.upsert({
    where: { sku: "BOTOX-50U" },
    update: {
      name: "Toxina botulinica 50U",
      description: "Vial para aplicaciones faciales.",
      lotNumber: "TB-2026-001",
      stockQuantity: decimal(12),
      minStockQuantity: decimal(4),
      unit: InventoryUnit.VIAL,
      expiresAt: new Date("2026-10-15T00:00:00.000Z"),
      supplierId: allergan.id,
      isActive: true,
    },
    create: {
      name: "Toxina botulinica 50U",
      description: "Vial para aplicaciones faciales.",
      sku: "BOTOX-50U",
      lotNumber: "TB-2026-001",
      stockQuantity: decimal(12),
      minStockQuantity: decimal(4),
      unit: InventoryUnit.VIAL,
      expiresAt: new Date("2026-10-15T00:00:00.000Z"),
      supplierId: allergan.id,
      isActive: true,
    },
  });

  const productHyaluronic = await prisma.product.upsert({
    where: { sku: "AH-1ML" },
    update: {
      name: "Acido hialuronico 1 ml",
      description: "Relleno dermico para surcos y labios.",
      lotNumber: "AH-2026-011",
      stockQuantity: decimal(8),
      minStockQuantity: decimal(3),
      unit: InventoryUnit.SYRINGE,
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      supplierId: allergan.id,
      isActive: true,
    },
    create: {
      name: "Acido hialuronico 1 ml",
      description: "Relleno dermico para surcos y labios.",
      sku: "AH-1ML",
      lotNumber: "AH-2026-011",
      stockQuantity: decimal(8),
      minStockQuantity: decimal(3),
      unit: InventoryUnit.SYRINGE,
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
      supplierId: allergan.id,
      isActive: true,
    },
  });

  const productThreads = await prisma.product.upsert({
    where: { sku: "HILOS-PDO-10" },
    update: {
      name: "Hilos PDO x 10",
      description: "Caja para tensado y bioestimulacion.",
      lotNumber: "PDO-2026-005",
      stockQuantity: decimal(5),
      minStockQuantity: decimal(2),
      unit: InventoryUnit.BOX,
      expiresAt: new Date("2026-12-20T00:00:00.000Z"),
      supplierId: bioinsumos.id,
      isActive: true,
    },
    create: {
      name: "Hilos PDO x 10",
      description: "Caja para tensado y bioestimulacion.",
      sku: "HILOS-PDO-10",
      lotNumber: "PDO-2026-005",
      stockQuantity: decimal(5),
      minStockQuantity: decimal(2),
      unit: InventoryUnit.BOX,
      expiresAt: new Date("2026-12-20T00:00:00.000Z"),
      supplierId: bioinsumos.id,
      isActive: true,
    },
  });

  const productSyringes = await prisma.product.upsert({
    where: { sku: "JERINGA-3ML" },
    update: {
      name: "Jeringa 3 ml",
      description: "Insumo para procedimientos y preparacion.",
      lotNumber: "JER-2026-031",
      stockQuantity: decimal(120),
      minStockQuantity: decimal(40),
      unit: InventoryUnit.UNIT,
      expiresAt: new Date("2027-01-15T00:00:00.000Z"),
      supplierId: bioinsumos.id,
      isActive: true,
    },
    create: {
      name: "Jeringa 3 ml",
      description: "Insumo para procedimientos y preparacion.",
      sku: "JERINGA-3ML",
      lotNumber: "JER-2026-031",
      stockQuantity: decimal(120),
      minStockQuantity: decimal(40),
      unit: InventoryUnit.UNIT,
      expiresAt: new Date("2027-01-15T00:00:00.000Z"),
      supplierId: bioinsumos.id,
      isActive: true,
    },
  });

  await upsertSaleItemByName({
    name: "Aplicacion de toxina botulinica",
    type: SaleItemType.TREATMENT,
    description: "Procedimiento estetico facial con control posterior.",
    unitPrice: decimal(850000),
  });

  await upsertSaleItemByName({
    name: "Relleno con acido hialuronico",
    type: SaleItemType.TREATMENT,
    description: "Perfilado y armonizacion facial.",
    unitPrice: decimal(1200000),
  });

  const saleBotox = await upsertSaleItemByName({
    name: "Toxina botulinica 50U",
    type: SaleItemType.PRODUCT,
    description: "Venta unitaria de vial.",
    unitPrice: decimal(540000),
    productId: productBotox.id,
  });

  const saleHyaluronic = await upsertSaleItemByName({
    name: "Acido hialuronico 1 ml",
    type: SaleItemType.PRODUCT,
    description: "Venta unitaria para procedimiento.",
    unitPrice: decimal(690000),
    productId: productHyaluronic.id,
  });

  await upsertSaleItemByName({
    name: "Hilos PDO x 10",
    type: SaleItemType.PRODUCT,
    description: "Venta por caja.",
    unitPrice: decimal(430000),
    productId: productThreads.id,
  });

  await upsertSaleItemByName({
    name: "Jeringa 3 ml",
    type: SaleItemType.PRODUCT,
    description: "Venta de insumo individual.",
    unitPrice: decimal(2500),
    productId: productSyringes.id,
  });

  const nextVisitAna = new Date();
  nextVisitAna.setDate(nextVisitAna.getDate() + 30);

  const nextVisitSara = new Date();
  nextVisitSara.setDate(nextVisitSara.getDate() + 21);

  const patientAna = await prisma.patient.upsert({
    where: { identification: "1032456789" },
    update: {
      firstName: "Ana",
      lastName: "Gonzalez",
      phone: "+57 300 888 1010",
      email: "ana.gonzalez@example.com",
      birthDate: new Date("1991-04-08T00:00:00.000Z"),
      allergies: "Penicilina",
      previousTreatments: "Limpiezas faciales y toxina botulinica previa.",
      importantNotes: "Prefiere citas en la manana.",
      lastVisitAt: new Date(),
      nextVisitAt: nextVisitAna,
    },
    create: {
      identification: "1032456789",
      firstName: "Ana",
      lastName: "Gonzalez",
      phone: "+57 300 888 1010",
      email: "ana.gonzalez@example.com",
      birthDate: new Date("1991-04-08T00:00:00.000Z"),
      allergies: "Penicilina",
      previousTreatments: "Limpiezas faciales y toxina botulinica previa.",
      importantNotes: "Prefiere citas en la manana.",
      lastVisitAt: new Date(),
      nextVisitAt: nextVisitAna,
    },
  });

  const patientSara = await prisma.patient.upsert({
    where: { identification: "52456789" },
    update: {
      firstName: "Sara",
      lastName: "Martinez",
      phone: "+57 315 456 7788",
      email: "sara.martinez@example.com",
      birthDate: new Date("1988-11-19T00:00:00.000Z"),
      allergies: "Ninguna referida",
      previousTreatments: "Rinomodelacion con acido hialuronico.",
      importantNotes: "Seguimiento cercano por sensibilidad en zona periorbital.",
      lastVisitAt: new Date(),
      nextVisitAt: nextVisitSara,
    },
    create: {
      identification: "52456789",
      firstName: "Sara",
      lastName: "Martinez",
      phone: "+57 315 456 7788",
      email: "sara.martinez@example.com",
      birthDate: new Date("1988-11-19T00:00:00.000Z"),
      allergies: "Ninguna referida",
      previousTreatments: "Rinomodelacion con acido hialuronico.",
      importantNotes: "Seguimiento cercano por sensibilidad en zona periorbital.",
      lastVisitAt: new Date(),
      nextVisitAt: nextVisitSara,
    },
  });

  const now = new Date();
  const revenueDateOne = new Date(now.getFullYear(), now.getMonth(), 10, 10, 30, 0);
  const revenueDateTwo = new Date(now.getFullYear(), now.getMonth(), 16, 15, 0, 0);

  const existingRevenueAna = await prisma.revenue.findFirst({
    where: {
      patientId: patientAna.id,
      saleItemId: saleBotox.id,
      occurredAt: revenueDateOne,
    },
  });

  if (!existingRevenueAna) {
    await prisma.revenue.create({
      data: {
        patientId: patientAna.id,
        saleItemId: saleBotox.id,
        occurredAt: revenueDateOne,
        amount: decimal(540000),
        paymentMethod: PaymentMethod.TRANSFER,
        notes: "Pago completo de procedimiento con control incluido.",
      },
    });
  }

  const existingRevenueSara = await prisma.revenue.findFirst({
    where: {
      patientId: patientSara.id,
      saleItemId: saleHyaluronic.id,
      occurredAt: revenueDateTwo,
    },
  });

  if (!existingRevenueSara) {
    await prisma.revenue.create({
      data: {
        patientId: patientSara.id,
        saleItemId: saleHyaluronic.id,
        occurredAt: revenueDateTwo,
        amount: decimal(690000),
        paymentMethod: PaymentMethod.CARD,
        notes: "Primera sesion de armonizacion labial.",
      },
    });
  }

  const expenseTemplates = [
    {
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 5, 8, 0, 0),
      amount: decimal(1800000),
      category: ExpenseCategory.RENT,
      description: "Canon de arrendamiento del consultorio",
    },
    {
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 7, 9, 30, 0),
      amount: decimal(420000),
      category: ExpenseCategory.UTILITIES,
      description: "Servicios publicos e internet",
    },
    {
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 14, 14, 0, 0),
      amount: decimal(350000),
      category: ExpenseCategory.MARKETING,
      description: "Campana de pauta en Instagram",
    },
  ];

  for (const expense of expenseTemplates) {
    const existingExpense = await prisma.expense.findFirst({
      where: {
        description: expense.description,
        occurredAt: expense.occurredAt,
      },
    });

    if (!existingExpense) {
      await prisma.expense.create({ data: expense });
    }
  }

  const movementTemplates = [
    {
      productId: productBotox.id,
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 2, 11, 0, 0),
      type: InventoryMovementType.PURCHASE,
      quantity: decimal(12),
      reason: "Ingreso inicial de stock",
    },
    {
      productId: productHyaluronic.id,
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 2, 11, 15, 0),
      type: InventoryMovementType.PURCHASE,
      quantity: decimal(8),
      reason: "Ingreso inicial de stock",
    },
    {
      productId: productThreads.id,
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 3, 9, 0, 0),
      type: InventoryMovementType.PURCHASE,
      quantity: decimal(5),
      reason: "Ingreso inicial de stock",
    },
  ];

  for (const movement of movementTemplates) {
    const existingMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: movement.productId,
        occurredAt: movement.occurredAt,
        type: movement.type,
      },
    });

    if (!existingMovement) {
      await prisma.inventoryMovement.create({ data: movement });
    }
  }

  console.log("Seed completado: catalogos, pacientes, ingresos, egresos e inventario inicial.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
