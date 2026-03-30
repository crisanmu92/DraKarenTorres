import { createPatient } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatDate } from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 12,
  });

  return (
    <>
      <SectionHeading
        eyebrow="Pacientes"
        title="Base de pacientes"
        description="Aqui registras y consultas la ficha inicial de tus pacientes."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          eyebrow="Nuevo registro"
          title="Agregar paciente"
          description="Guarda contacto, antecedentes relevantes y fechas de seguimiento."
        >
          <form action={createPatient} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Nombres"><input name="firstName" className={inputClassName} required /></Field>
              <Field label="Apellidos"><input name="lastName" className={inputClassName} required /></Field>
              <Field label="Identificacion"><input name="identification" className={inputClassName} required /></Field>
              <Field label="Telefono"><input name="phone" className={inputClassName} required /></Field>
              <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
              <Field label="Fecha de nacimiento"><input name="birthDate" type="date" className={inputClassName} /></Field>
              <Field label="Ultima visita"><input name="lastVisitAt" type="date" className={inputClassName} /></Field>
              <Field label="Proximo control"><input name="nextVisitAt" type="date" className={inputClassName} /></Field>
            </div>
            <Field label="Alergias"><textarea name="allergies" className={textareaClassName} /></Field>
            <Field label="Tratamientos previos"><textarea name="previousTreatments" className={textareaClassName} /></Field>
            <Field label="Notas importantes"><textarea name="importantNotes" className={textareaClassName} /></Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-(--color-muted)">{patients.length} pacientes visibles en esta lista.</p>
              <SubmitButton label="Guardar paciente" pendingLabel="Guardando paciente..." />
            </div>
          </form>
        </FormCard>

        <FormCard
          eyebrow="Listado"
          title="Pacientes recientes"
          description="Los ultimos pacientes creados aparecen aqui para consulta rapida."
        >
          <div className="grid gap-3">
            {patients.length === 0 ? (
              <EmptyState>Aun no hay pacientes registrados.</EmptyState>
            ) : (
              patients.map((patient) => (
                <div key={patient.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="font-semibold text-(--color-ink)">{patient.firstName} {patient.lastName}</p>
                  <p className="mt-1 text-sm text-(--color-muted)">{patient.identification} · {patient.phone}</p>
                  <p className="mt-2 text-sm text-(--color-muted)">Proximo control: {formatDate(patient.nextVisitAt)}</p>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </>
  );
}
