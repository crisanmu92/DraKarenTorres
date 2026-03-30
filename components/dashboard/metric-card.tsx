type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "positive" | "negative";
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: MetricCardProps) {
  const toneClassName = {
    neutral: "border-[var(--color-line)] bg-white/82 text-[var(--color-ink)]",
    positive: "border-[#d7cab8] bg-[#f8f1e8] text-[var(--color-ink)]",
    negative: "border-[#dbc8bf] bg-[#f6eee9] text-[var(--color-ink)]",
  }[tone];

  return (
    <article className={`rounded-[28px] border p-6 shadow-[var(--shadow-card)] ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-current/60">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-3 text-sm leading-6 text-current/72">{helper}</p>
    </article>
  );
}
