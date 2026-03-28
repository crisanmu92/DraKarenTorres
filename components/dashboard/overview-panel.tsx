type OverviewPanelProps = {
  title: string;
  value: string;
  description: string;
};

export function OverviewPanel({ title, value, description }: OverviewPanelProps) {
  return (
    <article className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-6 shadow-[var(--shadow-card)]">
      <p className="text-sm font-semibold text-[var(--color-muted)]">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
    </article>
  );
}
