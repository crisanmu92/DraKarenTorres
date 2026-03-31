import { ExpenseCategory, PaymentMethod } from "@prisma/client";

export const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

export const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
});

export function toNumber(value: unknown) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

export function formatMoney(value: unknown) {
  return currencyFormatter.format(toNumber(value));
}

export function getNetAmount(amount: unknown, discountAmount?: unknown) {
  return toNumber(amount) - toNumber(discountAmount);
}

export function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return dateFormatter.format(value);
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatDateInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${padNumber(value.getMonth() + 1)}-${padNumber(value.getDate())}`;
}

export function formatDateTimeInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return `${formatDateInput(value)}T${padNumber(value.getHours())}:${padNumber(value.getMinutes())}`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  UTILITIES: "Servicios",
  PAYROLL: "Nomina",
  SUPPLIES: "Insumos",
  MARKETING: "Marketing",
  RENT: "Arriendo",
  SOFTWARE: "Software",
  TAXES: "Impuestos",
  OTHER: "Otros",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};
