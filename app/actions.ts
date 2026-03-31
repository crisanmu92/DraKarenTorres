"use server";

import {
  ExpenseCategory,
  InventoryMovementType,
  InventoryUnit,
  PaymentMethod,
  Prisma,
  SaleItemType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const expenseCategories = Object.values(ExpenseCategory);
const inventoryMovementTypes = Object.values(InventoryMovementType);
const inventoryUnits = Object.values(InventoryUnit);
const paymentMethods = Object.values(PaymentMethod);
const saleItemTypes = Object.values(SaleItemType);
const serviceComponentSlots = 5;

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`El campo ${key} es obligatorio.`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getRequiredDecimal(formData: FormData, key: string) {
  const raw = getRequiredString(formData, key).replace(",", ".");
  const parsed = Number(raw);

  if (Number.isNaN(parsed)) {
    throw new Error(`El campo ${key} debe ser numerico.`);
  }

  return new Prisma.Decimal(parsed);
}

function getOptionalDecimal(formData: FormData, key: string) {
  const raw = getOptionalString(formData, key);

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw.replace(",", "."));

  if (Number.isNaN(parsed)) {
    throw new Error(`El campo ${key} debe ser numerico.`);
  }

  return new Prisma.Decimal(parsed);
}

function getOptionalDate(formData: FormData, key: string) {
  const raw = getOptionalString(formData, key);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`El campo ${key} debe ser una fecha valida.`);
  }

  return date;
}

function aggregateQuantitiesByProduct<T extends { productId: string; quantity: Prisma.Decimal }>(items: T[]) {
  const totals = new Map<string, Prisma.Decimal>();

  for (const item of items) {
    const current = totals.get(item.productId) ?? new Prisma.Decimal(0);
    totals.set(item.productId, current.add(item.quantity));
  }

  return totals;
}

function parseSaleItemComponents(formData: FormData) {
  const components: Array<{ productId: string; quantity: Prisma.Decimal }> = [];

  for (let index = 0; index < serviceComponentSlots; index += 1) {
    const productId = getOptionalString(formData, `componentProductId_${index}`);
    const quantityRaw = getOptionalString(formData, `componentQuantity_${index}`);

    if (!productId && !quantityRaw) {
      continue;
    }

    if (!productId || !quantityRaw) {
      throw new Error("Completa producto y cantidad en cada insumo del servicio.");
    }

    const quantity = new Prisma.Decimal(Number(quantityRaw.replace(",", ".")));

    if (quantity.lte(0)) {
      throw new Error("La cantidad de cada insumo debe ser mayor a cero.");
    }

    components.push({ productId, quantity });
  }

  const duplicates = new Set<string>();
  const seen = new Set<string>();

  for (const component of components) {
    if (seen.has(component.productId)) {
      duplicates.add(component.productId);
    }
    seen.add(component.productId);
  }

  if (duplicates.size > 0) {
    throw new Error("No repitas el mismo producto dentro de un servicio.");
  }

  return components;
}

async function syncSaleItemComponents(
  tx: Prisma.TransactionClient,
  saleItemId: string,
  components: Array<{ productId: string; quantity: Prisma.Decimal }>,
) {
  await tx.saleItemComponent.deleteMany({ where: { saleItemId } });

  if (components.length === 0) {
    return;
  }

  await tx.saleItemComponent.createMany({
    data: components.map((component) => ({
      saleItemId,
      productId: component.productId,
      quantity: component.quantity,
    })),
  });
}

async function getSaleItemInventoryCost(
  tx: Prisma.TransactionClient,
  saleItemId: string,
) {
  const components = await tx.saleItemComponent.findMany({
    where: { saleItemId },
    select: {
      productId: true,
      quantity: true,
      product: {
        select: {
          name: true,
          stockQuantity: true,
          costPrice: true,
        },
      },
    },
  });

  if (components.length === 0) {
    return { components: [], totalCost: undefined as Prisma.Decimal | undefined };
  }

  let totalCost = new Prisma.Decimal(0);

  for (const component of components) {
    if (component.product.stockQuantity.lt(component.quantity)) {
      throw new Error(`No hay inventario suficiente para ${component.product.name}.`);
    }

    const unitCost = component.product.costPrice ?? new Prisma.Decimal(0);
    totalCost = totalCost.add(unitCost.mul(component.quantity));
  }

  return { components, totalCost };
}

async function applyRevenueInventoryUsage(
  tx: Prisma.TransactionClient,
  revenueId: string,
  saleItemId: string,
) {
  const { components, totalCost } = await getSaleItemInventoryCost(tx, saleItemId);

  if (components.length === 0) {
    return undefined;
  }

  for (const component of components) {
    const unitCost = component.product.costPrice ?? new Prisma.Decimal(0);
    const totalComponentCost = unitCost.mul(component.quantity);

    await tx.product.update({
      where: { id: component.productId },
      data: {
        stockQuantity: {
          decrement: component.quantity,
        },
      },
    });

    await tx.revenueInventoryUsage.create({
      data: {
        revenueId,
        productId: component.productId,
        quantity: component.quantity,
        unitCost,
        totalCost: totalComponentCost,
      },
    });
  }

  return totalCost;
}

async function restoreRevenueInventoryUsage(
  tx: Prisma.TransactionClient,
  revenueIds: string[],
) {
  if (revenueIds.length === 0) {
    return;
  }

  const usages = await tx.revenueInventoryUsage.findMany({
    where: { revenueId: { in: revenueIds } },
    select: {
      productId: true,
      quantity: true,
    },
  });

  const aggregated = aggregateQuantitiesByProduct(usages);

  for (const [productId, quantity] of aggregated.entries()) {
    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: quantity,
        },
      },
    });
  }

  await tx.revenueInventoryUsage.deleteMany({
    where: { revenueId: { in: revenueIds } },
  });
}

function getAutoLotNumber() {
  return `AUTO-${Date.now()}`;
}

function getEnumValue<T extends string>(raw: string, values: readonly T[], key: string): T {
  if (!values.includes(raw as T)) {
    throw new Error(`El campo ${key} tiene un valor invalido.`);
  }

  return raw as T;
}

function finishMutation(extraPaths: string[] = []) {
  const paths = [
    "/",
    "/pacientes",
    "/ingresos",
    "/egresos",
    "/reportes",
    "/proveedores",
    "/inventario",
    "/servicios",
    "/movimientos",
    "/rentabilidad",
    ...extraPaths,
  ];

  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

function getId(formData: FormData) {
  return getRequiredString(formData, "id");
}

function getRedirectTarget(formData: FormData, fallback: string) {
  return getOptionalString(formData, "redirectTo") ?? fallback;
}

function redirectWithMessage(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`${path}?${searchParams.toString()}`);
}

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : String(error.meta?.target ?? "");

      if (target.includes("identification")) {
        return "Ya existe un cliente con esa identificacion.";
      }

      if (target.includes("email")) {
        return "Ese correo ya esta registrado.";
      }

      return "Ya existe un registro con esos datos.";
    }

    if (error.code === "P2003") {
      return "La relacion seleccionada no es valida. Revisa cliente y concepto.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function createPatient(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/pacientes");

  try {
    const saleItemId = getOptionalString(formData, "saleItemId");
    const amountValue = getOptionalString(formData, "amount");
    const costValue = getOptionalString(formData, "costAmount");
    const revenueOccurredAt = getOptionalDate(formData, "revenueOccurredAt");
    const revenueNotes = getOptionalString(formData, "revenueNotes");
    const hasRevenueIntent = Boolean(saleItemId || amountValue || costValue || revenueOccurredAt || revenueNotes);

    if (hasRevenueIntent && !saleItemId) {
      throw new Error("Selecciona el servicio si quieres registrar el cobro inicial.");
    }

    if (hasRevenueIntent && !amountValue) {
      throw new Error("Escribe cuanto cobraste por el servicio.");
    }

    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          firstName: getRequiredString(formData, "firstName"),
          lastName: getRequiredString(formData, "lastName"),
          identification: getRequiredString(formData, "identification"),
          phone: getRequiredString(formData, "phone"),
          email: getOptionalString(formData, "email"),
          birthDate: getOptionalDate(formData, "birthDate"),
          allergies: getOptionalString(formData, "allergies"),
          previousTreatments: getOptionalString(formData, "previousTreatments"),
          importantNotes: getOptionalString(formData, "importantNotes"),
          lastVisitAt: getOptionalDate(formData, "lastVisitAt"),
          nextVisitAt: getOptionalDate(formData, "nextVisitAt"),
        },
      });

      if (hasRevenueIntent && saleItemId && amountValue) {
        const saleItem = await tx.saleItem.findUnique({
          where: { id: saleItemId },
          select: { baseCost: true },
        });

        await tx.revenue.create({
          data: {
            occurredAt: revenueOccurredAt ?? new Date(),
            amount: getRequiredDecimal(formData, "amount"),
            costAmount: getOptionalDecimal(formData, "costAmount") ?? saleItem?.baseCost ?? undefined,
            paymentMethod: getEnumValue(
              getRequiredString(formData, "paymentMethod"),
              paymentMethods,
              "paymentMethod",
            ),
            notes: revenueNotes,
            patientId: patient.id,
            saleItemId,
          },
        });
      }
    });

    finishMutation();
    redirectWithMessage(redirectTo, {
      success: hasRevenueIntent
        ? "Cliente y servicio inicial guardados correctamente."
        : "Cliente guardado correctamente.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo guardar el cliente."),
    });
  }
}

export async function createSupplier(formData: FormData) {
  await prisma.supplier.create({
    data: {
      companyName: getRequiredString(formData, "companyName"),
      commercialAdvisor: getOptionalString(formData, "commercialAdvisor"),
      phone: getOptionalString(formData, "phone"),
      email: getOptionalString(formData, "email"),
      notes: getOptionalString(formData, "notes"),
    },
  });

  finishMutation();
}

export async function createProduct(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/inventario");
  const stockQuantity = getRequiredDecimal(formData, "stockQuantity");
  const totalPurchaseAmount = getRequiredDecimal(formData, "totalPurchaseAmount");

  if (stockQuantity.lte(0)) {
    throw new Error("La cantidad comprada debe ser mayor a cero.");
  }

  if (totalPurchaseAmount.lt(0)) {
    throw new Error("El valor total no puede ser negativo.");
  }

  const costPrice = totalPurchaseAmount.div(stockQuantity);

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: getRequiredString(formData, "name"),
          description: getOptionalString(formData, "description"),
          sku: undefined,
          lotNumber: getAutoLotNumber(),
          costPrice,
          stockQuantity,
          minStockQuantity: new Prisma.Decimal(0),
          unit: getEnumValue(
            getRequiredString(formData, "unit"),
            inventoryUnits,
            "unit",
          ),
          expiresAt: getOptionalDate(formData, "expiresAt"),
          supplierId: getRequiredString(formData, "supplierId"),
        },
      });

      if (stockQuantity.gt(0)) {
        await tx.inventoryMovement.create({
          data: {
            occurredAt: new Date(),
            type: InventoryMovementType.PURCHASE,
            quantity: stockQuantity,
            reason: "Compra inicial registrada desde la ficha del proveedor.",
            productId: product.id,
          },
        });
      }
    });

    finishMutation([redirectTo]);
    redirectWithMessage(redirectTo, { success: "Compra guardada correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo guardar la compra."),
    });
  }
}

export async function createSaleItem(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/servicios");
  const type = getEnumValue(
    getRequiredString(formData, "type"),
    saleItemTypes,
    "type",
  );
  const productId = getOptionalString(formData, "productId");
  const components = parseSaleItemComponents(formData);

  try {
    await prisma.$transaction(async (tx) => {
      const saleItem = await tx.saleItem.create({
        data: {
          name: getRequiredString(formData, "name"),
          type,
          description: getOptionalString(formData, "description"),
          unitPrice: getRequiredDecimal(formData, "unitPrice"),
          baseCost: getOptionalDecimal(formData, "baseCost"),
          productId,
        },
      });

      await syncSaleItemComponents(tx, saleItem.id, components);
    });

    finishMutation([redirectTo]);
    redirectWithMessage(redirectTo, { success: "Servicio guardado correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo guardar el servicio."),
    });
  }
}

export async function createRevenue(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/ingresos");

  try {
    const saleItemId = getRequiredString(formData, "saleItemId");
    const manualCost = getOptionalDecimal(formData, "costAmount");
    await prisma.$transaction(async (tx) => {
      const saleItem = await tx.saleItem.findUnique({
        where: { id: saleItemId },
        select: { baseCost: true },
      });

      const revenue = await tx.revenue.create({
        data: {
          occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
          amount: getRequiredDecimal(formData, "amount"),
          costAmount: undefined,
          paymentMethod: getEnumValue(
            getRequiredString(formData, "paymentMethod"),
            paymentMethods,
            "paymentMethod",
          ),
          notes: getOptionalString(formData, "notes"),
          patientId: getRequiredString(formData, "patientId"),
          saleItemId,
        },
      });

      const inventoryCost = await applyRevenueInventoryUsage(tx, revenue.id, saleItemId);
      const resolvedCost = inventoryCost ?? manualCost ?? saleItem?.baseCost ?? undefined;

      await tx.revenue.update({
        where: { id: revenue.id },
        data: {
          costAmount: resolvedCost,
        },
      });
    });

    finishMutation();
    redirectWithMessage(redirectTo, { success: "Ingreso guardado correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo registrar el ingreso."),
    });
  }
}

export async function createExpense(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/egresos");

  try {
    await prisma.expense.create({
      data: {
        occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
        amount: getRequiredDecimal(formData, "amount"),
        category: getEnumValue(
          getRequiredString(formData, "category"),
          expenseCategories,
          "category",
        ),
        description: getRequiredString(formData, "description"),
        notes: getOptionalString(formData, "notes"),
      },
    });

    finishMutation();
    redirectWithMessage(redirectTo, { success: "Egreso guardado correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo registrar el egreso."),
    });
  }
}

export async function createInventoryMovement(formData: FormData) {
  await prisma.inventoryMovement.create({
    data: {
      occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
      type: getEnumValue(
        getRequiredString(formData, "type"),
        inventoryMovementTypes,
        "type",
      ),
      quantity: getRequiredDecimal(formData, "quantity"),
      reason: getOptionalString(formData, "reason"),
      productId: getRequiredString(formData, "productId"),
    },
  });

  finishMutation();
}

export async function updatePatient(formData: FormData) {
  await prisma.patient.update({
    where: { id: getId(formData) },
    data: {
      firstName: getRequiredString(formData, "firstName"),
      lastName: getRequiredString(formData, "lastName"),
      identification: getRequiredString(formData, "identification"),
      phone: getRequiredString(formData, "phone"),
      email: getOptionalString(formData, "email"),
      birthDate: getOptionalDate(formData, "birthDate"),
      allergies: getOptionalString(formData, "allergies"),
      previousTreatments: getOptionalString(formData, "previousTreatments"),
      importantNotes: getOptionalString(formData, "importantNotes"),
      lastVisitAt: getOptionalDate(formData, "lastVisitAt"),
      nextVisitAt: getOptionalDate(formData, "nextVisitAt"),
    },
  });

  finishMutation();
}

export async function deletePatient(formData: FormData) {
  const id = getId(formData);
  await prisma.$transaction(async (tx) => {
    const revenues = await tx.revenue.findMany({
      where: { patientId: id },
      select: { id: true },
    });

    await restoreRevenueInventoryUsage(
      tx,
      revenues.map((revenue) => revenue.id),
    );
    await tx.revenue.deleteMany({ where: { patientId: id } });
    await tx.patient.delete({ where: { id } });
  });

  finishMutation();
}

export async function updateSupplier(formData: FormData) {
  await prisma.supplier.update({
    where: { id: getId(formData) },
    data: {
      companyName: getRequiredString(formData, "companyName"),
      commercialAdvisor: getOptionalString(formData, "commercialAdvisor"),
      phone: getOptionalString(formData, "phone"),
      email: getOptionalString(formData, "email"),
      notes: getOptionalString(formData, "notes"),
    },
  });

  finishMutation();
}

export async function deleteSupplier(formData: FormData) {
  const id = getId(formData);
  const products = await prisma.product.findMany({
    where: { supplierId: id },
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);

  await prisma.$transaction(async (tx) => {
    if (productIds.length > 0) {
      await tx.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } });
      await tx.revenueInventoryUsage.deleteMany({ where: { productId: { in: productIds } } });
      await tx.saleItemComponent.deleteMany({ where: { productId: { in: productIds } } });
      await tx.saleItem.updateMany({
        where: { productId: { in: productIds } },
        data: { productId: null },
      });
      await tx.product.deleteMany({ where: { id: { in: productIds } } });
    }

    await tx.supplier.delete({ where: { id } });
  });

  finishMutation();
}

export async function updateProduct(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/inventario");
  const stockQuantity = getRequiredDecimal(formData, "stockQuantity");
  const totalPurchaseAmount = getRequiredDecimal(formData, "totalPurchaseAmount");

  if (stockQuantity.lte(0)) {
    throw new Error("La cantidad debe ser mayor a cero.");
  }

  if (totalPurchaseAmount.lt(0)) {
    throw new Error("El valor total no puede ser negativo.");
  }

  const existingProduct = await prisma.product.findUnique({
    where: { id: getId(formData) },
    select: {
      sku: true,
      lotNumber: true,
      minStockQuantity: true,
      isActive: true,
      supplierId: true,
    },
  });

  if (!existingProduct) {
    throw new Error("No se encontro el producto que quieres actualizar.");
  }

  try {
    await prisma.product.update({
      where: { id: getId(formData) },
      data: {
        name: getRequiredString(formData, "name"),
        description: getOptionalString(formData, "description"),
        sku: existingProduct.sku,
        lotNumber: existingProduct.lotNumber,
        costPrice: totalPurchaseAmount.div(stockQuantity),
        stockQuantity,
        minStockQuantity: existingProduct.minStockQuantity,
        unit: getEnumValue(getRequiredString(formData, "unit"), inventoryUnits, "unit"),
        expiresAt: getOptionalDate(formData, "expiresAt"),
        supplierId: existingProduct.supplierId,
        isActive: existingProduct.isActive,
      },
    });

    finishMutation();
    redirectWithMessage(redirectTo, { success: "Compra actualizada correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo actualizar la compra."),
    });
  }
}

export async function deleteProduct(formData: FormData) {
  const id = getId(formData);
  const redirectTo = getRedirectTarget(formData, "/inventario");

  try {
    await prisma.$transaction([
      prisma.inventoryMovement.deleteMany({ where: { productId: id } }),
      prisma.revenueInventoryUsage.deleteMany({ where: { productId: id } }),
      prisma.saleItemComponent.deleteMany({ where: { productId: id } }),
      prisma.saleItem.updateMany({
        where: { productId: id },
        data: { productId: null },
      }),
      prisma.product.delete({ where: { id } }),
    ]);

    finishMutation();
    redirectWithMessage(redirectTo, { success: "Compra eliminada correctamente." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectWithMessage(redirectTo, {
      error: getFriendlyErrorMessage(error, "No se pudo eliminar la compra."),
    });
  }
}

export async function updateSaleItem(formData: FormData) {
  const id = getId(formData);
  const type = getEnumValue(getRequiredString(formData, "type"), saleItemTypes, "type");
  const productId = getOptionalString(formData, "productId");
  const components = parseSaleItemComponents(formData);

  await prisma.$transaction(async (tx) => {
    await tx.saleItem.update({
      where: { id },
      data: {
        name: getRequiredString(formData, "name"),
        type,
        description: getOptionalString(formData, "description"),
        unitPrice: getRequiredDecimal(formData, "unitPrice"),
        baseCost: getOptionalDecimal(formData, "baseCost"),
        productId,
      },
    });

    await syncSaleItemComponents(tx, id, components);
  });

  finishMutation();
}

export async function deleteSaleItem(formData: FormData) {
  const id = getId(formData);
  await prisma.$transaction(async (tx) => {
    const revenues = await tx.revenue.findMany({
      where: { saleItemId: id },
      select: { id: true },
    });

    await restoreRevenueInventoryUsage(
      tx,
      revenues.map((revenue) => revenue.id),
    );
    await tx.revenue.deleteMany({ where: { saleItemId: id } });
    await tx.saleItem.delete({ where: { id } });
  });

  finishMutation();
}

export async function updateRevenue(formData: FormData) {
  const saleItemId = getRequiredString(formData, "saleItemId");
  const manualCost = getOptionalDecimal(formData, "costAmount");
  const revenueId = getId(formData);

  await prisma.$transaction(async (tx) => {
    const saleItem = await tx.saleItem.findUnique({
      where: { id: saleItemId },
      select: { baseCost: true },
    });

    await restoreRevenueInventoryUsage(tx, [revenueId]);

    const inventoryCost = await applyRevenueInventoryUsage(tx, revenueId, saleItemId);
    const resolvedCost = inventoryCost ?? manualCost ?? saleItem?.baseCost ?? undefined;

    await tx.revenue.update({
      where: { id: revenueId },
      data: {
        occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
        amount: getRequiredDecimal(formData, "amount"),
        costAmount: resolvedCost,
        paymentMethod: getEnumValue(
          getRequiredString(formData, "paymentMethod"),
          paymentMethods,
          "paymentMethod",
        ),
        notes: getOptionalString(formData, "notes"),
        patientId: getRequiredString(formData, "patientId"),
        saleItemId,
      },
    });
  });

  finishMutation();
}

export async function deleteRevenue(formData: FormData) {
  const id = getId(formData);

  await prisma.$transaction(async (tx) => {
    await restoreRevenueInventoryUsage(tx, [id]);
    await tx.revenue.delete({ where: { id } });
  });

  finishMutation();
}

export async function updateExpense(formData: FormData) {
  await prisma.expense.update({
    where: { id: getId(formData) },
    data: {
      occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
      amount: getRequiredDecimal(formData, "amount"),
      category: getEnumValue(
        getRequiredString(formData, "category"),
        expenseCategories,
        "category",
      ),
      description: getRequiredString(formData, "description"),
      notes: getOptionalString(formData, "notes"),
    },
  });

  finishMutation();
}

export async function deleteExpense(formData: FormData) {
  await prisma.expense.delete({ where: { id: getId(formData) } });
  finishMutation();
}

export async function updateInventoryMovement(formData: FormData) {
  await prisma.inventoryMovement.update({
    where: { id: getId(formData) },
    data: {
      occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
      type: getEnumValue(
        getRequiredString(formData, "type"),
        inventoryMovementTypes,
        "type",
      ),
      quantity: getRequiredDecimal(formData, "quantity"),
      reason: getOptionalString(formData, "reason"),
      productId: getRequiredString(formData, "productId"),
    },
  });

  finishMutation();
}

export async function deleteInventoryMovement(formData: FormData) {
  await prisma.inventoryMovement.delete({ where: { id: getId(formData) } });
  finishMutation();
}
