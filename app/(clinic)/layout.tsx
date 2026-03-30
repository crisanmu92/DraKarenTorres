import type { ReactNode } from "react";

import { ClinicNavigation } from "@/components/clinic/navigation";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-0 lg:grid-cols-[18.5rem_minmax(0,1fr)]">
        <aside className="border-r border-white/8 bg-[#0f172a] px-4 py-5 sm:px-6 lg:min-h-screen lg:px-5 lg:py-6">
          <article className="rounded-[28px] border border-white/10 bg-white/4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/48">
              Menu
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">
              Finance app
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Navegacion principal para registrar clientes y movimientos financieros.
            </p>
            <div className="mt-4">
              <ClinicNavigation />
            </div>
          </article>

          <article className="mt-4 rounded-[28px] border border-[#22c55e]/16 bg-[#111c34] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#86efac]">
              Estado rapido
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-white/70">
              <p>1. Dashboard para ver la foto general.</p>
              <p>2. Clientes para tu base comercial.</p>
              <p>3. Ingresos, egresos y reportes para caja.</p>
            </div>
          </article>
        </aside>

        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</div>
      </section>
    </main>
  );
}
