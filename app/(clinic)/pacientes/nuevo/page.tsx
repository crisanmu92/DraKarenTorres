import Link from "next/link";

import { createPatient } from "@/app/actions";
import {
  Field,
  FormCard,
  SectionHeading,
  formGridClassName,
  inputClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";

export const dynamic = "force-dynamic";

export default function NewPatientPage() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/pacientes"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a pacientes
        </Link>
      </div>

      <SectionHeading
        eyebrow="Nuevo paciente"
        title="Agregar paciente"
        description="Registra la ficha inicial del paciente. Los servicios realizados se agregan despues dentro de su ficha."
      />

      <FormCard
        eyebrow="Ficha inicial"
        title="Datos del paciente"
        description="Guarda contacto, antecedentes, fechas y notas importantes."
      >
        <form action={createPatient} className="grid gap-4">
          <input type="hidden" name="redirectTo" value="/pacientes" />
          <div className={formGridClassName}>
            <Field label="Nombres"><input name="firstName" className={inputClassName} required /></Field>
            <Field label="Apellidos"><input name="lastName" className={inputClassName} required /></Field>
            <Field label="Identificacion"><input name="identification" className={inputClassName} required /></Field>
            <Field label="Telefono"><input name="phone" className={inputClassName} required /></Field>
            <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
            <Field label="Fecha de nacimiento"><input name="birthDate" type="date" className={inputClassName} /></Field>
            <Field label="Ultima visita"><input name="lastVisitAt" type="date" className={inputClassName} /></Field>
            <Field label="Proximo seguimiento"><input name="nextVisitAt" type="date" className={inputClassName} /></Field>
          </div>
          <Field label="Alergias"><textarea name="allergies" className={textareaClassName} /></Field>
          <Field label="Historial o servicios previos"><textarea name="previousTreatments" className={textareaClassName} /></Field>
          <Field label="Notas importantes"><textarea name="importantNotes" className={textareaClassName} /></Field>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-(--color-muted)">Los servicios se agregan despues dentro del paciente.</p>
            <SubmitButton label="Guardar paciente" pendingLabel="Guardando paciente..." />
          </div>
        </form>
      </FormCard>
    </>
  );
}
