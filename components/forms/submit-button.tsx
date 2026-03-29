"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const className = {
    primary:
      "bg-[#23302b] text-[#f8f3ec]",
    secondary:
      "border border-(--color-line) bg-white text-(--color-ink)",
    danger:
      "bg-rose-700 text-white",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel ?? "Guardando..." : label}
    </button>
  );
}
