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
    neutral: "border-[var(--color-line)] bg-white text-[var(--color-ink)]",
    positive: "border-[#b7ebc6] bg-[#f2fcf5] text-[var(--color-ink)]",
    negative: "border-[#f0c9c2] bg-[#fff5f3] text-[var(--color-ink)]",
  }[tone];

  return (
    <article className={`rounded-[24px] border p-5 shadow-[var(--shadow-card)] sm:p-6 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-current/60">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-3 text-sm leading-6 text-current/72">{helper}</p>
    </article>
  );
}
