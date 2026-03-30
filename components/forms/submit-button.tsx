"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
} & Pick<ComponentProps<"button">, "formAction" | "name" | "value">;

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  formAction,
  name,
  value,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const className = {
    primary:
      "bg-[#181311] text-[#fffdf9]",
    secondary:
      "border border-(--color-line) bg-[#fffdfa] text-(--color-ink)",
    danger:
      "bg-[#8d5a48] text-white",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      formAction={formAction}
      name={name}
      value={value}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel ?? "Guardando..." : label}
    </button>
  );
}
