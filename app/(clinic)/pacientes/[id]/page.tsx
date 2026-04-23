import Link from "next/link";
import { PaymentMethod } from "@prisma/client";

import {
  createPatientFollowUp,
  createRevenue,
  deletePatientFollowUp,
  deleteRevenue,
  updatePatientFollowUp,
  updateRevenue,
} from "@/app/actions";
import {
  EmptyState,
  Field,
  FormCard,
  Notice,
  SectionHeading,
  formGridClassName,
  inputClassName,
  sectionCardClassName,
  textareaClassName,
} from "@/components/clinic/ui";
import { SubmitButton } from "@/components/forms/submit-button";
import { InventoryUsageFields } from "@/components/forms/inventory-usage-fields";
import { CalendarLinks } from "@/components/forms/calendar-links";
import { PatientFollowUpImageFields } from "@/components/forms/patient-follow-up-image-fields";
import {
  formatDate,
  formatDateTime,
  formatDateInput,
  formatDateTimeInput,
  formatMoney,
  getNetAmount,
  paymentMethodLabels,
  toNumber,
} from "@/lib/clinic-format";
import { prisma } from "@/lib/prisma";

function getFollowUpTone(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("botox")) {
    return "bg-[#eef4ff] text-[#1d4ed8] border-[#c7d7fe]";
  }

  if (normalized.includes("acido") || normalized.includes("hialuron")) {
    return "bg-[#fff4e6] text-[#b45309] border-[#f8d5a4]";
  }

  if (normalized.includes("laser")) {
    return "bg-[#f5ecff] text-[#7c3aed] border-[#dcc7ff]";
  }

  if (normalized.includes("control") || normalized.includes("revision")) {
    return "bg-[#eefbf4] text-[#15803d] border-[#c7efd8]";
  }

  return "bg-[#f4f4f5] text-[#3f3f46] border-[#e4e4e7]";
}

function getFollowUpCategoryLabel(title: string) {
  const normalized = title.toLowerCase();

  if (normalized.includes("botox")) {
    return "Botox";
  }

  if (normalized.includes("acido") || normalized.includes("hialuron")) {
    return "Acido hialuronico";
  }

  if (normalized.includes("laser")) {
    return "Laser";
  }

  if (normalized.includes("control") || normalized.includes("revision")) {
    return "Control";
  }

  return "Seguimiento";
}

export const dynamic = "force-dynamic";

function PhotoPreview({
  label,
  src,
}: {
  label: string;
  src: string | null | undefined;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">
        {label}
      </p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="h-44 w-full rounded-3xl border border-(--color-line) object-cover"
        />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-3xl border border-dashed border-(--color-line) bg-[#f8fbff] px-4 text-sm text-(--color-muted)">
          Sin imagen
        </div>
      )}
    </div>
  );
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let patient: {
    id: string;
    firstName: string;
    lastName: string;
    identification: string;
    phone: string;
    email: string | null;
    nextVisitAt: Date | null;
    importantNotes: string | null;
    followUps: Array<{
      id: string;
      controlDate: Date;
      title: string;
      notes: string | null;
      nextFollowUpAt: Date | null;
      beforeImageUrl: string | null;
      afterImageUrl: string | null;
      createdAt: Date;
    }>;
    revenues: Array<{
      id: string;
      occurredAt: Date;
      amount: unknown;
      discountAmount: unknown;
      costAmount: unknown;
      paymentMethod: PaymentMethod;
      notes: string | null;
      patientId: string;
      saleItemId: string;
      saleItem: { name: string };
      inventoryUsages: Array<{
        productId: string;
        quantity: unknown;
      }>;
    }>;
  } | null = null;
  let saleItems: Array<{
    id: string;
    name: string;
    unitPrice: unknown;
    baseCost: unknown;
  }> = [];
  let products: Array<{
    id: string;
    name: string;
    unit: string;
    costPrice: unknown;
  }> = [];
  let firstRevenueDate: Date | null = null;
  let firstFollowUpDate: Date | null = null;
  let pageError: string | null = null;

  try {
    const [resolvedPatient, resolvedSaleItems, resolvedProducts, earliestRevenue, earliestFollowUp] = await Promise.all([
      prisma.patient.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          identification: true,
          phone: true,
          email: true,
          nextVisitAt: true,
          importantNotes: true,
          followUps: {
            orderBy: [{ controlDate: "desc" }, { createdAt: "desc" }],
            take: 30,
            select: {
              id: true,
              controlDate: true,
              title: true,
              notes: true,
              nextFollowUpAt: true,
              beforeImageUrl: true,
              afterImageUrl: true,
              createdAt: true,
            },
          },
          revenues: {
            include: {
              saleItem: { select: { name: true } },
              inventoryUsages: {
                select: {
                  productId: true,
                  quantity: true,
                },
                orderBy: [{ createdAt: "asc" }],
              },
            },
            orderBy: [{ occurredAt: "desc" }],
            take: 20,
          },
        },
      }),
      prisma.saleItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, unitPrice: true, baseCost: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          unit: true,
          costPrice: true,
        },
      }),
      prisma.revenue.findFirst({
        where: { patientId: id },
        orderBy: [{ occurredAt: "asc" }],
        select: {
          occurredAt: true,
        },
      }),
      prisma.patientFollowUp.findFirst({
        where: { patientId: id },
        orderBy: [{ controlDate: "asc" }, { createdAt: "asc" }],
        select: {
          controlDate: true,
        },
      }),
    ]);

    patient = resolvedPatient;
    saleItems = resolvedSaleItems;
    products = resolvedProducts;
    firstRevenueDate = earliestRevenue?.occurredAt ?? null;
    firstFollowUpDate = earliestFollowUp?.controlDate ?? null;
  } catch {
    pageError = "No se pudo cargar la ficha del paciente.";
  }

  if (!patient && !pageError) {
    pageError = "No se encontro el paciente solicitado.";
  }

  const totalCharged =
    patient?.revenues.reduce(
      (sum, revenue) => sum + getNetAmount(revenue.amount, revenue.discountAmount),
      0,
    ) ?? 0;
  const totalCost = patient?.revenues.reduce((sum, revenue) => sum + toNumber(revenue.costAmount), 0) ?? 0;
  const firstVisitDate =
    firstRevenueDate && firstFollowUpDate
      ? firstRevenueDate <= firstFollowUpDate
        ? firstRevenueDate
        : firstFollowUpDate
      : firstRevenueDate ?? firstFollowUpDate ?? patient?.lastVisitAt ?? null;

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
        eyebrow="Paciente"
        title={patient ? `${patient.firstName} ${patient.lastName}` : "Ficha del paciente"}
        description="Aqui registras los servicios realizados, haces seguimiento de controles y guardas fotos de antes y despues."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      {patient ? (
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="grid gap-4">
              <article className={sectionCardClassName}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Telefono</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{patient.phone}</p>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Identificacion</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{patient.identification}</p>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Correo</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{patient.email ?? "Sin correo"}</p>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Primera visita</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{formatDate(firstVisitDate)}</p>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Proximo seguimiento</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{formatDateTime(patient.nextVisitAt)}</p>
                    <div className="mt-3">
                      <CalendarLinks
                        patientId={patient.id}
                        patientName={`${patient.firstName} ${patient.lastName}`}
                        date={patient.nextVisitAt}
                        title={`Control de ${patient.firstName} ${patient.lastName}`}
                      />
                    </div>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Total cobrado</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{formatMoney(totalCharged)}</p>
                  </div>
                  <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Ganancia acumulada</p>
                    <p className="mt-2 font-semibold text-(--color-ink)">{formatMoney(totalCharged - totalCost)}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Notas importantes</p>
                  <p className="mt-2 text-sm leading-6 text-(--color-ink)">{patient.importantNotes ?? "Sin notas importantes."}</p>
                </div>
              </article>

              <FormCard
                eyebrow="Seguimiento"
                title="Agregar control e historial"
                description="Registra cada control con fecha, notas clinicas, proxima cita y enlaces de fotos de antes y despues."
              >
                <form action={createPatientFollowUp} className="grid gap-4">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="redirectTo" value={`/pacientes/${patient.id}`} />
                  <div className={formGridClassName}>
                    <Field label="Fecha del servicio">
                      <input name="controlDate" type="date" className={inputClassName} required />
                    </Field>
                    <Field label="Proximo seguimiento">
                      <input name="nextFollowUpAt" type="datetime-local" className={inputClassName} />
                    </Field>
                  </div>
                  <Field label="Titulo del control">
                    <input
                      name="title"
                      className={inputClassName}
                      placeholder="Ej. Control de botox, revision post tratamiento, valoracion"
                      required
                    />
                  </Field>
                  <Field label="Notas del seguimiento">
                    <textarea
                      name="notes"
                      className={textareaClassName}
                      placeholder="Evolucion, respuesta del paciente, recomendaciones y observaciones."
                    />
                  </Field>
                  <PatientFollowUpImageFields />
                  <div className={formGridClassName}>
                    <Field label="Foto antes por enlace (opcional)">
                      <input
                        name="beforeImageUrl"
                        type="url"
                        className={inputClassName}
                        placeholder="https://..."
                      />
                    </Field>
                    <Field label="Foto despues por enlace (opcional)">
                      <input
                        name="afterImageUrl"
                        type="url"
                        className={inputClassName}
                        placeholder="https://..."
                      />
                    </Field>
                  </div>
                  <SubmitButton label="Guardar seguimiento" pendingLabel="Guardando seguimiento..." />
                </form>
              </FormCard>

              <FormCard
                eyebrow="Nuevo servicio"
                title="Agregar servicio realizado"
                description="Cada servicio queda guardado con el monto cobrado y aqui puedes registrar los suministros usados."
              >
                <form action={createRevenue} className="grid gap-4">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="redirectTo" value={`/pacientes/${patient.id}`} />
                  <div className={formGridClassName}>
                    <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" className={inputClassName} /></Field>
                    <Field label="Servicio">
                      <select name="saleItemId" className={inputClassName} required>
                        <option value="">Selecciona un servicio</option>
                        {saleItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · precio sugerido {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Cuanto le cobraste"><input name="amount" type="number" step="0.01" min="0" className={inputClassName} required /></Field>
                    <Field label="Descuento"><input name="discountAmount" type="number" step="0.01" min="0" className={inputClassName} /></Field>
                    <Field label="Medio de pago">
                      <select name="paymentMethod" className={inputClassName} defaultValue="TRANSFER" required>
                        {Object.values(PaymentMethod).map((method) => (
                          <option key={method} value={method}>
                            {paymentMethodLabels[method]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
                  <InventoryUsageFields
                    products={products}
                    title="Suministros del inventario"
                    description="Agrega aqui los productos realmente usados en este servicio para descontarlos del inventario y calcular el costo."
                  />
                  <SubmitButton label="Guardar servicio" pendingLabel="Guardando servicio..." />
                </form>
              </FormCard>
            </div>

            <div className="grid gap-4">
              <FormCard
                eyebrow="Historial"
                title="Controles y seguimientos"
                description="Aqui ves la evolucion del paciente por fecha y puedes revisar sus fotos de antes y despues."
              >
                <div className="grid gap-3">
                  {patient.followUps.length === 0 ? (
                    <EmptyState>Este paciente aun no tiene seguimientos registrados.</EmptyState>
                  ) : (
                    patient.followUps.map((followUp) => (
                      <div key={followUp.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-(--color-ink)">{followUp.title}</p>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getFollowUpTone(followUp.title)}`}>
                                {getFollowUpCategoryLabel(followUp.title)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              Control: {formatDate(followUp.controlDate)} · Proximo seguimiento: {formatDateTime(followUp.nextFollowUpAt)}
                            </p>
                          </div>
                          <CalendarLinks
                            patientId={patient.id}
                            patientName={`${patient.firstName} ${patient.lastName}`}
                            date={followUp.nextFollowUpAt}
                            title={`${followUp.title} · ${patient.firstName} ${patient.lastName}`}
                            notes={followUp.notes}
                            compact
                          />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-(--color-ink)">
                          {followUp.notes ?? "Sin notas registradas en este control."}
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <PhotoPreview label="Antes" src={followUp.beforeImageUrl} />
                          <PhotoPreview label="Despues" src={followUp.afterImageUrl} />
                        </div>
                        <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                          <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                            Editar o eliminar seguimiento
                          </summary>
                          <div className="mt-4 grid gap-4">
                            <form action={updatePatientFollowUp} className="grid gap-4">
                              <input type="hidden" name="id" value={followUp.id} />
                              <input type="hidden" name="patientId" value={patient.id} />
                              <input type="hidden" name="redirectTo" value={`/pacientes/${patient.id}`} />
                              <div className={formGridClassName}>
                                <Field label="Fecha del servicio">
                                  <input
                                    name="controlDate"
                                    type="date"
                                    defaultValue={formatDateInput(followUp.controlDate)}
                                    className={inputClassName}
                                    required
                                  />
                                </Field>
                                <Field label="Proximo seguimiento">
                                  <input
                                    name="nextFollowUpAt"
                                    type="datetime-local"
                                    defaultValue={formatDateTimeInput(followUp.nextFollowUpAt)}
                                    className={inputClassName}
                                  />
                                </Field>
                              </div>
                              <Field label="Titulo del control">
                                <input name="title" defaultValue={followUp.title} className={inputClassName} required />
                              </Field>
                              <Field label="Notas del seguimiento">
                                <textarea name="notes" defaultValue={followUp.notes ?? ""} className={textareaClassName} />
                              </Field>
                              <PatientFollowUpImageFields />
                              <div className={formGridClassName}>
                                <Field label="Foto antes por enlace (opcional)">
                                  <input
                                    name="beforeImageUrl"
                                    type="url"
                                    defaultValue={followUp.beforeImageUrl ?? ""}
                                    className={inputClassName}
                                  />
                                </Field>
                                <Field label="Foto despues por enlace (opcional)">
                                  <input
                                    name="afterImageUrl"
                                    type="url"
                                    defaultValue={followUp.afterImageUrl ?? ""}
                                    className={inputClassName}
                                  />
                                </Field>
                              </div>
                              <input type="hidden" name="currentBeforeImageUrl" value={followUp.beforeImageUrl ?? ""} />
                              <input type="hidden" name="currentAfterImageUrl" value={followUp.afterImageUrl ?? ""} />
                              <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                            </form>
                            <form action={deletePatientFollowUp}>
                              <input type="hidden" name="id" value={followUp.id} />
                              <input type="hidden" name="patientId" value={patient.id} />
                              <input type="hidden" name="redirectTo" value={`/pacientes/${patient.id}`} />
                              <SubmitButton label="Eliminar seguimiento" pendingLabel="Eliminando..." variant="danger" />
                            </form>
                          </div>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </FormCard>

              <FormCard
                eyebrow="Historial"
                title="Servicios realizados"
                description="Aqui ves los servicios ya hechos al paciente y puedes corregir o eliminar cualquier registro."
              >
                <div className="grid gap-3">
                  {patient.revenues.length === 0 ? (
                    <EmptyState>Este paciente aun no tiene servicios registrados.</EmptyState>
                  ) : (
                    patient.revenues.map((revenue) => (
                      <div key={revenue.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-(--color-ink)">{revenue.saleItem.name}</p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              {formatDate(revenue.occurredAt)} · {paymentMethodLabels[revenue.paymentMethod]}
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              Cobrado: {formatMoney(revenue.amount)} · Descuento: {formatMoney(revenue.discountAmount)} · Neto: {formatMoney(getNetAmount(revenue.amount, revenue.discountAmount))}
                            </p>
                            <p className="mt-1 text-sm text-(--color-muted)">
                              Costo: {formatMoney(revenue.costAmount)} · Ganancia: {formatMoney(getNetAmount(revenue.amount, revenue.discountAmount) - toNumber(revenue.costAmount))}
                            </p>
                          </div>
                        </div>
                        <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                          <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                            Editar o eliminar
                          </summary>
                          <div className="mt-4 grid gap-4">
                            <form action={updateRevenue} className="grid gap-4">
                              <input type="hidden" name="id" value={revenue.id} />
                              <div className={formGridClassName}>
                                <Field label="Fecha y hora"><input name="occurredAt" type="datetime-local" defaultValue={formatDateTimeInput(revenue.occurredAt)} className={inputClassName} /></Field>
                                <Field label="Servicio">
                                  <select name="saleItemId" defaultValue={revenue.saleItemId} className={inputClassName} required>
                                    {saleItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name} · precio sugerido {formatMoney(item.unitPrice)} · costo base {formatMoney(item.baseCost)}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Cuanto le cobraste"><input name="amount" type="number" step="0.01" min="0" defaultValue={String(revenue.amount)} className={inputClassName} required /></Field>
                                <Field label="Descuento">
                                  <input
                                    name="discountAmount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    defaultValue={revenue.discountAmount == null ? "" : String(revenue.discountAmount)}
                                    className={inputClassName}
                                  />
                                </Field>
                                <Field label="Medio de pago">
                                  <select name="paymentMethod" defaultValue={revenue.paymentMethod} className={inputClassName} required>
                                    {Object.values(PaymentMethod).map((method) => (
                                      <option key={method} value={method}>
                                        {paymentMethodLabels[method]}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              </div>
                              <Field label="Notas"><textarea name="notes" defaultValue={revenue.notes ?? ""} className={textareaClassName} /></Field>
                              <InventoryUsageFields
                                products={products}
                                title="Suministros del inventario"
                                description="Ajusta los productos usados en este servicio para recalcular costo y stock."
                                initialValues={revenue.inventoryUsages.map((usage) => ({
                                  productId: usage.productId,
                                  quantity: String(usage.quantity),
                                }))}
                              />
                              <input type="hidden" name="patientId" value={patient.id} />
                              <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                            </form>
                            <form action={deleteRevenue}>
                              <input type="hidden" name="id" value={revenue.id} />
                              <SubmitButton label="Eliminar servicio" pendingLabel="Eliminando..." variant="danger" />
                            </form>
                          </div>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </FormCard>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
