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

function getEnumValue<T extends string>(raw: string, values: readonly T[], key: string): T {
  if (!values.includes(raw as T)) {
    throw new Error(`El campo ${key} tiene un valor invalido.`);
  }

  return raw as T;
}

function finishMutation() {
  const paths = ["/", "/pacientes", "/ingresos", "/egresos", "/reportes", "/proveedores", "/inventario", "/servicios", "/movimientos", "/rentabilidad"];

  for (const path of paths) {
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
    await prisma.patient.create({
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
    redirectWithMessage(redirectTo, { success: "Cliente guardado correctamente." });
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

  try {
    await prisma.product.create({
      data: {
        name: getRequiredString(formData, "name"),
        description: getOptionalString(formData, "description"),
        sku: getOptionalString(formData, "sku"),
        lotNumber: getRequiredString(formData, "lotNumber"),
        costPrice: getOptionalDecimal(formData, "costPrice"),
        stockQuantity: getRequiredDecimal(formData, "stockQuantity"),
        minStockQuantity: getRequiredDecimal(formData, "minStockQuantity"),
        unit: getEnumValue(
          getRequiredString(formData, "unit"),
          inventoryUnits,
          "unit",
        ),
        expiresAt: getOptionalDate(formData, "expiresAt"),
        supplierId: getRequiredString(formData, "supplierId"),
      },
    });

    finishMutation();
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
  const type = getEnumValue(
    getRequiredString(formData, "type"),
    saleItemTypes,
    "type",
  );
  const productId = getOptionalString(formData, "productId");

  if (type === SaleItemType.PRODUCT && !productId) {
    throw new Error("Los items de tipo producto deben enlazarse a un producto.");
  }

  await prisma.saleItem.create({
    data: {
      name: getRequiredString(formData, "name"),
      type,
      description: getOptionalString(formData, "description"),
      unitPrice: getRequiredDecimal(formData, "unitPrice"),
      baseCost: getOptionalDecimal(formData, "baseCost"),
      productId,
    },
  });

  finishMutation();
}

export async function createRevenue(formData: FormData) {
  const redirectTo = getRedirectTarget(formData, "/ingresos");

  try {
    const saleItemId = getRequiredString(formData, "saleItemId");
    const manualCost = getOptionalDecimal(formData, "costAmount");
    const saleItem = await prisma.saleItem.findUnique({
      where: { id: saleItemId },
      select: { baseCost: true },
    });

    await prisma.revenue.create({
      data: {
        occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
        amount: getRequiredDecimal(formData, "amount"),
        costAmount: manualCost ?? saleItem?.baseCost ?? undefined,
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

  await prisma.$transaction([
    prisma.revenue.deleteMany({ where: { patientId: id } }),
    prisma.patient.delete({ where: { id } }),
  ]);

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

  try {
    await prisma.product.update({
      where: { id: getId(formData) },
      data: {
        name: getRequiredString(formData, "name"),
        description: getOptionalString(formData, "description"),
        sku: getOptionalString(formData, "sku"),
        lotNumber: getRequiredString(formData, "lotNumber"),
        costPrice: getOptionalDecimal(formData, "costPrice"),
        stockQuantity: getRequiredDecimal(formData, "stockQuantity"),
        minStockQuantity: getRequiredDecimal(formData, "minStockQuantity"),
        unit: getEnumValue(getRequiredString(formData, "unit"), inventoryUnits, "unit"),
        expiresAt: getOptionalDate(formData, "expiresAt"),
        supplierId: getRequiredString(formData, "supplierId"),
        isActive: getRequiredString(formData, "isActive") === "true",
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

  if (type === SaleItemType.PRODUCT && !productId) {
    throw new Error("Los items de tipo producto deben enlazarse a un producto.");
  }

  await prisma.saleItem.update({
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

  finishMutation();
}

export async function deleteSaleItem(formData: FormData) {
  const id = getId(formData);

  await prisma.$transaction([
    prisma.revenue.deleteMany({ where: { saleItemId: id } }),
    prisma.saleItem.delete({ where: { id } }),
  ]);

  finishMutation();
}

export async function updateRevenue(formData: FormData) {
  const saleItemId = getRequiredString(formData, "saleItemId");
  const manualCost = getOptionalDecimal(formData, "costAmount");
  const saleItem = await prisma.saleItem.findUnique({
    where: { id: saleItemId },
    select: { baseCost: true },
  });

  await prisma.revenue.update({
    where: { id: getId(formData) },
    data: {
      occurredAt: getOptionalDate(formData, "occurredAt") ?? new Date(),
      amount: getRequiredDecimal(formData, "amount"),
      costAmount: manualCost ?? saleItem?.baseCost ?? undefined,
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

  finishMutation();
}

export async function deleteRevenue(formData: FormData) {
  await prisma.revenue.delete({ where: { id: getId(formData) } });
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
