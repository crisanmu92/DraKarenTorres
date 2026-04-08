type CalendarLinksProps = {
  patientId: string;
  patientName: string;
  date: Date | null | undefined;
  title?: string;
  notes?: string | null;
  compact?: boolean;
};

function CalendarAddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2.75v3" />
      <path d="M16 2.75v3" />
      <path d="M3.75 9.25h16.5" />
      <path d="M12 12v6" />
      <path d="M9 15h6" />
      <rect x="3.75" y="4.75" width="16.5" height="15.5" rx="2.5" />
    </svg>
  );
}

export function CalendarLinks({
  patientId,
  patientName,
  date,
  title,
  notes,
  compact = false,
}: CalendarLinksProps) {
  if (!date) {
    return null;
  }

  const eventTitle = title?.trim() || `Control de ${patientName}`;
  const downloadHref = `/api/calendar/patients/${encodeURIComponent(patientId)}?date=${encodeURIComponent(
    date.toISOString(),
  )}&title=${encodeURIComponent(eventTitle)}${notes ? `&notes=${encodeURIComponent(notes)}` : ""}`;

  const baseClassName = compact
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe4f0] bg-white text-[#1f2937]"
    : "inline-flex items-center justify-center rounded-full border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937]";

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "items-center" : ""}`}>
      <a href={downloadHref} className={baseClassName} aria-label="Agregar al calendario" title="Agregar al calendario">
        {compact ? <CalendarAddIcon /> : "Agregar al calendario"}
      </a>
    </div>
  );
}
