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
    ? "inline-flex items-center justify-center rounded-full border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-semibold text-[#1f2937]"
    : "inline-flex items-center justify-center rounded-full border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2937]";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={downloadHref} className={baseClassName}>
        Agregar al calendario
      </a>
      <a href={googleHref} target="_blank" rel="noreferrer" className={baseClassName}>
        Abrir en Google Calendar
      </a>
    </div>
  );
}
