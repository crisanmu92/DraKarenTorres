import type { ReactNode } from "react";

import { ClinicNavigation } from "@/components/clinic/navigation";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto grid min-h-screen w-full max-w-[1560px] gap-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-r border-white/8 bg-[#0f172a] px-4 py-5 sm:px-6 lg:min-h-screen lg:px-6 lg:py-7">
          <article className="rounded-[32px] border border-white/10 bg-white/4 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/48">
              Menu
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white">
              Panel privado
            </h2>
            <p className="mt-4 text-base leading-7 text-white/60">
              Navegacion principal para registrar pacientes, proveedores, servicios e ingresos.
            </p>
            <div className="mt-6">
              <ClinicNavigation />
            </div>
          </article>

          <article className="mt-5 rounded-[32px] border border-[#22c55e]/16 bg-[#111c34] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#86efac]">
              Estado rapido
            </p>
            <div className="mt-5 grid gap-4 text-base leading-7 text-white/72">
              <p>1. Registra primero pacientes y proveedores.</p>
              <p>2. Luego configura servicios e inventario.</p>
              <p>3. Usa movimientos para ingresos y egresos.</p>
            </div>
          </article>
        </aside>

        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</div>
      </section>
    </main>
  );
}
