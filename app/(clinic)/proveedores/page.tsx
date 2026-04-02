import Link from "next/link";

import { deleteSupplier, updateSupplier } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
import { ExportLink } from "@/components/forms/export-link";
import { SubmitButton } from "@/components/forms/submit-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  let suppliers: Array<{
    id: string;
    companyName: string;
    commercialAdvisor: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }> = [];
  let pageError: string | null = null;

  try {
    suppliers = await prisma.supplier.findMany({ orderBy: [{ createdAt: "desc" }], take: 16 });
  } catch {
    pageError = "No se pudo cargar la informacion de proveedores.";
  }

  return (
    <>
      <SectionHeading
        eyebrow="Abastecimiento"
        title="Registro de proveedores"
        description="Aqui registras laboratorios o distribuidores. Entra a cada proveedor para cargar lo que le compraste."
      />

      <div className="flex justify-end">
        <ExportLink section="suppliers" label="Descargar Excel de proveedores" />
      </div>

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <div className="grid gap-4">
        <FormCard
          eyebrow="Directorio"
          title="Proveedores registrados"
          description="Desde aqui ves la lista. Usa el boton para agregar proveedores nuevos y entra a cada ficha para registrar compras."
        >
          <div className="mb-5 flex justify-end">
            <Link
              href="/proveedores/nuevo"
              className="inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white"
            >
              Agregar proveedor
            </Link>
          </div>
          <div className="grid gap-3">
            {suppliers.length === 0 ? (
              <EmptyState>Aun no hay proveedores registrados.</EmptyState>
            ) : (
              suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-(--color-ink)">{supplier.companyName}</p>
                      <p className="mt-1 text-sm text-(--color-muted)">
                        {supplier.commercialAdvisor ?? "Sin asesor"} · {supplier.phone ?? "Sin telefono"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/proveedores/${supplier.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-[#2f5be7] px-5 py-3 text-sm font-semibold text-white"
                      >
                        Ver proveedor
                      </Link>
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-full border border-(--color-line) bg-[#fcfaf7] px-4 py-3 text-sm font-semibold text-(--color-ink)">
                          Editar o eliminar
                        </summary>
                        <div className="absolute right-0 z-10 mt-3 w-[min(92vw,36rem)] rounded-[28px] border border-(--color-line) bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
                          <div className="grid gap-4">
                            <form action={updateSupplier} className="grid gap-4">
                              <input type="hidden" name="id" value={supplier.id} />
                              <div className={formGridClassName}>
                                <Field label="Empresa"><input name="companyName" defaultValue={supplier.companyName} className={inputClassName} required /></Field>
                                <Field label="Asesor comercial"><input name="commercialAdvisor" defaultValue={supplier.commercialAdvisor ?? ""} className={inputClassName} /></Field>
                                <Field label="Telefono"><input name="phone" defaultValue={supplier.phone ?? ""} className={inputClassName} /></Field>
                                <Field label="Correo"><input name="email" type="email" defaultValue={supplier.email ?? ""} className={inputClassName} /></Field>
                              </div>
                              <Field label="Notas"><textarea name="notes" defaultValue={supplier.notes ?? ""} className={textareaClassName} /></Field>
                              <SubmitButton label="Guardar cambios" pendingLabel="Guardando cambios..." variant="secondary" />
                            </form>
                            <form action={deleteSupplier}>
                              <input type="hidden" name="id" value={supplier.id} />
                              <SubmitButton label="Eliminar proveedor" pendingLabel="Eliminando..." variant="danger" />
                            </form>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </>
  );
}
