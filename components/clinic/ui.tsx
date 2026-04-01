import Link from "next/link";
import type { ReactNode } from "react";

export const sectionCardClassName =
  "rounded-[24px] border border-(--color-line) bg-white p-5 shadow-(--shadow-card) sm:p-6";

export const inputClassName =
  "w-full rounded-2xl border border-(--color-line) bg-[#f8fbff] px-4 py-3 text-sm text-(--color-ink) outline-none transition focus:border-[#111827]";

export const textareaClassName = `${inputClassName} min-h-28 resize-y`;
export const formGridClassName = "grid gap-3 sm:grid-cols-2";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-(--color-muted)">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-(--color-line) bg-[var(--color-panel)]/45 px-4 py-5 text-sm text-(--color-muted)">
      {children}
    </div>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-[#b7ebc6] bg-[#f2fcf5] text-[#166534]"
      : "border-[#f0c9c2] bg-[#fff5f3] text-[#b42318]";

  return (
    <div className={`rounded-3xl border px-4 py-4 text-sm font-medium ${className}`}>
      {children}
    </div>
  );
}

export function FilterTabs({
  options,
}: {
  options: Array<{
    href: string;
    label: string;
    active?: boolean;
  }>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
            option.active
              ? "bg-[#2f5be7] text-white shadow-[0_12px_24px_rgba(47,91,231,0.22)]"
              : "border border-(--color-line) bg-[#f8fbff] text-(--color-ink) hover:bg-[#eef4ff]"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function FormCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className={sectionCardClassName}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-tight text-(--color-ink)">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-(--color-muted)">{description}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--color-muted)">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-tight text-(--color-ink) sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-7 text-(--color-muted)">{description}</p>
    </div>
  );
}
