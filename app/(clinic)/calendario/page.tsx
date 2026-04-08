import Link from "next/link";

import { EmptyState, FormCard, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import { CalendarLinks } from "@/components/forms/calendar-links";
import { formatDateTime, monthFormatter } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const weekDayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function parseMonthValue(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return new Date(year, monthIndex, 1);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function getCalendarStart(value: Date) {
  const firstDay = new Date(value.getFullYear(), value.getMonth(), 1);
  const weekDay = firstDay.getDay();
  const diff = weekDay === 0 ? -6 : 1 - weekDay;
  return addDays(firstDay, diff);
}

function getDayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getMonthPath(value: Date) {
  return `/calendario?month=${getMonthValue(value)}`;
}

function getAppointmentTone(title: string | null) {
  const normalized = (title ?? "").toLowerCase();

  if (normalized.includes("botox")) {
    return "border-[#c7d7fe] bg-[#eef4ff] text-[#1d4ed8]";
  }

  if (normalized.includes("acido") || normalized.includes("hialuron")) {
    return "border-[#f8d5a4] bg-[#fff4e6] text-[#b45309]";
  }

  if (normalized.includes("laser")) {
    return "border-[#dcc7ff] bg-[#f5ecff] text-[#7c3aed]";
  }

  return "border-[#c7efd8] bg-[#eefbf4] text-[#15803d]";
}

type AppointmentRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  nextVisitAt: Date;
  importantNotes: string | null;
  latestFollowUp: { title: string; notes: string | null } | null;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfDay(new Date());
  const selectedMonth = parseMonthValue(resolvedSearchParams?.month) ?? new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const nextMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
  const previousMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  const followingMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
  const gridStart = getCalendarStart(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  let appointments: AppointmentRow[] = [];
  let pageError: string | null = null;

  try {
    const rows = await prisma.patient.findMany({
      where: {
        nextVisitAt: {
          not: null,
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      orderBy: [{ nextVisitAt: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        nextVisitAt: true,
        importantNotes: true,
        followUps: {
          where: {
            nextFollowUpAt: {
              not: null,
            },
          },
          orderBy: [{ nextFollowUpAt: "desc" }],
          take: 1,
          select: {
            title: true,
            notes: true,
          },
        },
      },
    });

    appointments = rows
      .filter((row): row is typeof row & { nextVisitAt: Date } => row.nextVisitAt instanceof Date)
      .map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        nextVisitAt: row.nextVisitAt,
        importantNotes: row.importantNotes,
        latestFollowUp: row.followUps[0] ?? null,
      }));
  } catch {
    pageError = "No se pudo cargar el calendario de reservas.";
  }

  const appointmentsByDay = new Map<string, AppointmentRow[]>();

  for (const appointment of appointments) {
    const key = getDayKey(appointment.nextVisitAt);
    const current = appointmentsByDay.get(key) ?? [];
    current.push(appointment);
    appointmentsByDay.set(key, current);
  }

  const totalMonthAppointments = appointments.length;
  const upcomingAppointments = appointments.filter((appointment) => appointment.nextVisitAt >= today).length;

  return (
    <>
      <SectionHeading
        eyebrow="Agenda"
        title="Calendario de reservas"
        description="Aqui ves todas las citas y seguimientos agendados de tus pacientes en un solo lugar."
      />

      {pageError ? <div className="mt-4 rounded-3xl border border-[#f0c9c2] bg-[#fff5f3] px-4 py-4 text-sm font-medium text-[#b42318]">{pageError}</div> : null}

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className={`${sectionCardClassName} grid gap-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-muted)">Vista mensual</p>
              <h2 className="mt-2 text-2xl font-semibold text-(--color-ink)">{monthFormatter.format(monthStart)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={getMonthPath(previousMonth)} className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)">
                Mes anterior
              </Link>
              <Link href={getMonthPath(new Date())} className="inline-flex items-center justify-center rounded-full bg-[#2f5be7] px-4 py-2 text-sm font-semibold text-white">
                Hoy
              </Link>
              <Link href={getMonthPath(followingMonth)} className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)">
                Mes siguiente
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">
            {weekDayLabels.map((label) => (
              <div key={label} className="rounded-2xl bg-[#f8fbff] px-2 py-3">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
            {days.map((day) => {
              const key = getDayKey(day);
              const dayAppointments = appointmentsByDay.get(key) ?? [];
              const inCurrentMonth = day.getMonth() === monthStart.getMonth();
              const isToday = key === getDayKey(today);

              return (
                <div
                  key={key}
                  className={`min-h-32 rounded-3xl border px-3 py-3 ${
                    isToday
                      ? "border-[#2f5be7] bg-[#eef4ff]"
                      : inCurrentMonth
                        ? "border-(--color-line) bg-white"
                        : "border-(--color-line) bg-[#f8fbff] text-(--color-muted)"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${isToday ? "text-[#2f5be7]" : "text-(--color-ink)"}`}>{day.getDate()}</p>
                    {dayAppointments.length > 0 ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#111827] px-2 text-xs font-semibold text-white">
                        {dayAppointments.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {dayAppointments.slice(0, 3).map((appointment) => {
                      const followUpTitle = appointment.latestFollowUp?.title ?? "Seguimiento";

                      return (
                        <Link
                          key={appointment.id}
                          href={`/pacientes/${appointment.id}`}
                          className={`rounded-2xl border px-3 py-2 text-left text-xs font-semibold ${getAppointmentTone(followUpTitle)}`}
                        >
                          <p>{formatDateTime(appointment.nextVisitAt)}</p>
                          <p className="mt-1 line-clamp-2">{appointment.firstName} {appointment.lastName}</p>
                        </Link>
                      );
                    })}
                    {dayAppointments.length > 3 ? (
                      <p className="text-xs font-semibold text-(--color-muted)">+ {dayAppointments.length - 3} reservas mas</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <div className="grid gap-4">
          <article className={`${sectionCardClassName} grid gap-3`}>
            <div className="rounded-3xl border border-(--color-line) bg-[#f8fbff] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Reservas del mes</p>
              <p className="mt-2 text-3xl font-semibold text-(--color-ink)">{totalMonthAppointments}</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-[#f8fbff] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)">Pendientes desde hoy</p>
              <p className="mt-2 text-3xl font-semibold text-(--color-ink)">{upcomingAppointments}</p>
            </div>
          </article>

          <FormCard
            eyebrow="Reservas"
            title="Lista del periodo"
            description="Usa esta lista para revisar rapido cada cita, entrar a la ficha del paciente y agregarla al calendario."
          >
            <div className="grid gap-3">
              {appointments.length === 0 ? (
                <EmptyState>No hay reservas registradas en este mes.</EmptyState>
              ) : (
                appointments.map((appointment) => {
                  const fullName = `${appointment.firstName} ${appointment.lastName}`;
                  const latestFollowUp = appointment.latestFollowUp;

                  return (
                    <div key={appointment.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-(--color-ink)">{fullName}</p>
                          <p className="mt-1 text-sm text-(--color-muted)">{formatDateTime(appointment.nextVisitAt)}</p>
                          <p className="mt-1 text-sm text-(--color-muted)">Telefono: {appointment.phone}</p>
                          <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getAppointmentTone(latestFollowUp?.title ?? "Seguimiento")}`}>
                            {latestFollowUp?.title ?? "Seguimiento programado"}
                          </p>
                          {appointment.importantNotes ? (
                            <p className="mt-3 max-w-xl text-sm leading-6 text-(--color-muted)">{appointment.importantNotes}</p>
                          ) : null}
                        </div>
                        <div className="grid gap-2">
                          <CalendarLinks
                            patientId={appointment.id}
                            patientName={fullName}
                            date={appointment.nextVisitAt}
                            title={`${latestFollowUp?.title ?? "Control"} · ${fullName}`}
                            notes={latestFollowUp?.notes ?? appointment.importantNotes}
                          />
                          <Link
                            href={`/pacientes/${appointment.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-[#f8fbff] px-4 py-2 text-sm font-semibold text-(--color-ink)"
                          >
                            Ver paciente
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </FormCard>

          <FormCard
            eyebrow="Resumen"
            title="Que muestra este calendario"
            description="La agenda toma la proxima cita guardada en cada paciente. Cuando cambias el proximo seguimiento en la ficha, aqui se actualiza automaticamente."
          >
            <div className="grid gap-2 text-sm leading-6 text-(--color-muted)">
              <p>Las reservas salen de la fecha `Proximo seguimiento` del paciente.</p>
              <p>Si la cita tiene hora, se muestra con hora exacta.</p>
              <p>Desde aqui puedes abrir la ficha del paciente y agregar la cita al calendario del celular.</p>
            </div>
          </FormCard>
        </div>
      </section>
    </>
  );
}
