function toCalendarDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}${month}${day}`;
}

function toCalendarDateTime(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  const hours = `${value.getUTCHours()}`.padStart(2, "0");
  const minutes = `${value.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${value.getUTCSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function hasExplicitTime(value: Date) {
  return value.getHours() !== 0 || value.getMinutes() !== 0;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

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

function CalendarGoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.75 4.75h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" />
      <path d="M8 2.75v3" />
      <path d="M16 2.75v3" />
      <path d="M4.75 9h14.5" />
      <path d="M12 12.25v4.5" />
      <path d="M9.75 14.5H14.25" />
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
  const timedEvent = hasExplicitTime(date);
  const start = timedEvent ? toCalendarDateTime(date) : toCalendarDate(date);
  const end = timedEvent ? toCalendarDateTime(addDays(date, 0)) : toCalendarDate(addDays(date, 1));
  const safeEnd = timedEvent ? toCalendarDateTime(new Date(date.getTime() + 60 * 60 * 1000)) : end;
  const details = [
    `Paciente: ${patientName}`,
    notes?.trim() ? `Notas: ${notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const downloadHref = `/api/calendar/patients/${encodeURIComponent(patientId)}?date=${encodeURIComponent(
    date.toISOString(),
  )}&title=${encodeURIComponent(eventTitle)}${notes ? `&notes=${encodeURIComponent(notes)}` : ""}`;

  const googleHref =
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}` +
    `&dates=${start}/${safeEnd}&details=${encodeURIComponent(details)}`;

  const baseClassName = compact
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe4f0] bg-white text-[#1f2937]"
    : "inline-flex items-center justify-center rounded-full border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937]";

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "items-center" : ""}`}>
      <a href={downloadHref} className={baseClassName} aria-label="Agregar al calendario" title="Agregar al calendario">
        {compact ? <CalendarAddIcon /> : "Agregar al calendario"}
      </a>
      <a
        href={googleHref}
        target="_blank"
        rel="noreferrer"
        className={baseClassName}
        aria-label="Abrir en Google Calendar"
        title="Abrir en Google Calendar"
      >
        {compact ? <CalendarGoogleIcon /> : "Abrir en Google Calendar"}
      </a>
    </div>
  );
}
