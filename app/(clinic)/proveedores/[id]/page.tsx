import Link from "next/link";

import { Notice, SectionHeading, sectionCardClassName } from "@/components/clinic/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  let supplier: {
    id: string;
    companyName: string;
    commercialAdvisor: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
  } | null = null;
  let pageError: string | null = null;

  try {
    supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        commercialAdvisor: true,
        phone: true,
        email: true,
        notes: true,
      },
    });
  } catch {
    pageError = "No se pudo cargar la ficha del proveedor.";
  }

  if (!supplier && !pageError) {
    pageError = "No se encontro el proveedor solicitado.";
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/proveedores"
          className="inline-flex items-center justify-center rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-semibold text-(--color-ink)"
        >
          Volver a proveedores
        </Link>
      </div>

      <SectionHeading
        eyebrow="Proveedor"
        title={supplier?.companyName ?? "Ficha del proveedor"}
        description="Esta vista queda solo para consultar la informacion del proveedor. No se mostraran productos ni items de venta en esta seccion."
      />

      {resolvedSearchParams?.success ? <Notice tone="success">{resolvedSearchParams.success}</Notice> : null}
      {resolvedSearchParams?.error ? <Notice tone="error">{resolvedSearchParams.error}</Notice> : null}
      {pageError ? <Notice tone="error">{pageError}</Notice> : null}

      {supplier ? (
        <article className={sectionCardClassName}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Empresa</p>
              <p className="mt-2 font-semibold text-(--color-ink)">{supplier.companyName}</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Asesor</p>
              <p className="mt-2 font-semibold text-(--color-ink)">{supplier.commercialAdvisor ?? "Sin asesor"}</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Telefono</p>
              <p className="mt-2 font-semibold text-(--color-ink)">{supplier.phone ?? "Sin telefono"}</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Correo</p>
              <p className="mt-2 font-semibold text-(--color-ink)">{supplier.email ?? "Sin correo"}</p>
            </div>
            <div className="rounded-3xl border border-(--color-line) bg-white px-4 py-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-muted)">Notas</p>
              <p className="mt-2 font-semibold text-(--color-ink)">{supplier.notes ?? "Sin notas"}</p>
            </div>
          </div>
        </article>
      ) : null}
    </>
  );
}
