import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}${month}${day}`;
}

function formatIcsDateTime(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  const hours = `${value.getUTCHours()}`.padStart(2, "0");
  const minutes = `${value.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${value.getUTCSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasExplicitTime(value: Date) {
  return value.getHours() !== 0 || value.getMinutes() !== 0;
}

export async function GET(request: Request, context: RouteContext<"/api/calendar/patients/[id]">) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const date = parseDate(url.searchParams.get("date"));

  if (!date) {
    return new Response("Fecha invalida para crear el evento.", { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  });

  if (!patient) {
    return new Response("Paciente no encontrado.", { status: 404 });
  }

  const patientName = `${patient.firstName} ${patient.lastName}`.trim();
  const title = url.searchParams.get("title")?.trim() || `Control de ${patientName}`;
  const extraNotes = url.searchParams.get("notes")?.trim();
  const descriptionLines = [
    `Paciente: ${patientName}`,
    patient.phone ? `Telefono: ${patient.phone}` : null,
    patient.email ? `Correo: ${patient.email}` : null,
    extraNotes ? `Notas: ${extraNotes}` : null,
  ].filter(Boolean);

  const todayStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const timedEvent = hasExplicitTime(date);
  const eventStamp = timedEvent ? formatIcsDateTime(date) : formatIcsDate(date);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dra Karen Torres//Calendario Pacientes//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:patient-${id}-${eventStamp}@dra-karen-torres`,
    `DTSTAMP:${todayStamp}`,
    timedEvent ? `DTSTART:${formatIcsDateTime(date)}` : `DTSTART;VALUE=DATE:${formatIcsDate(date)}`,
    timedEvent
      ? `DTEND:${formatIcsDateTime(new Date(date.getTime() + 60 * 60 * 1000))}`
      : `DTEND;VALUE=DATE:${formatIcsDate(addDays(date, 1))}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="control-${id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
