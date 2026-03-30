import { createSupplier, deleteSupplier, updateSupplier } from "@/app/actions";
import { EmptyState, Field, FormCard, formGridClassName, inputClassName, SectionHeading, textareaClassName } from "@/components/clinic/ui";
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
        description="Aqui solo registras laboratorios o distribuidores. Luego, desde inventario, agregas lo que le compraste a cada proveedor."
      />

      {pageError ? <EmptyState>{pageError}</EmptyState> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FormCard eyebrow="Proveedores" title="Agregar proveedor" description="Registra laboratorios o distribuidores.">
          <form action={createSupplier} className="grid gap-4">
            <div className={formGridClassName}>
              <Field label="Empresa"><input name="companyName" className={inputClassName} required /></Field>
              <Field label="Asesor comercial"><input name="commercialAdvisor" className={inputClassName} /></Field>
              <Field label="Telefono"><input name="phone" className={inputClassName} /></Field>
              <Field label="Correo"><input name="email" type="email" className={inputClassName} /></Field>
            </div>
            <Field label="Notas"><textarea name="notes" className={textareaClassName} /></Field>
            <SubmitButton label="Guardar proveedor" pendingLabel="Guardando proveedor..." />
          </form>
          <div className="mt-6 grid gap-3">
            {suppliers.length === 0 ? <EmptyState>Aun no hay proveedores.</EmptyState> : suppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <p className="font-semibold text-(--color-ink)">{supplier.companyName}</p>
                <p className="mt-1 text-sm text-(--color-muted)">{supplier.commercialAdvisor ?? "Sin asesor"} · {supplier.phone ?? "Sin telefono"}</p>
                <details className="mt-4 rounded-3xl border border-(--color-line) bg-[#fcfaf7] px-4 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
                    Editar o eliminar
                  </summary>
                  <div className="mt-4 grid gap-4">
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
                </details>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard
          eyebrow="Paso siguiente"
          title="Proveedores registrados"
          description="Cuando ya exista el proveedor, usa el boton de compra para ir a inventario y registrar lo que le compraste."
        >
          <div className="mt-6 grid gap-3">
            {suppliers.length === 0 ? <EmptyState>Aun no hay proveedores registrados.</EmptyState> : suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-(--color-ink)">{supplier.companyName}</p>
                    <p className="mt-1 text-sm text-(--color-muted)">
                      {supplier.commercialAdvisor ?? "Sin asesor"} · {supplier.phone ?? "Sin telefono"}
                    </p>
                  </div>
                  <a
                    href={`/inventario?supplierId=${supplier.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[#2f5be7] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Agregar compra
                  </a>
                </div>
              </div>
            ))}
          </div>
        </FormCard>
      </div>
    </>
  );
}
