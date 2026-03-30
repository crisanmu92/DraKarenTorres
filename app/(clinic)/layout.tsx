import type { ReactNode } from "react";

import { ClinicNavigation } from "@/components/clinic/navigation";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top,rgba(214,193,167,0.28),transparent_48%),linear-gradient(180deg,rgba(251,247,242,0.98),rgba(246,238,228,0.88))]" />
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-8 sm:py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside className="grid gap-4 self-start lg:sticky lg:top-6">
          <article className="rounded-4xl border border-(--color-line) bg-white/90 p-5 shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
              Menu
            </p>
            <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.03em] text-(--color-ink)">
              Aplicacion web
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--color-muted)">
              Navegacion principal para registrar clientes y movimientos financieros.
            </p>
            <div className="mt-4">
              <ClinicNavigation />
            </div>
          </article>

          <article className="rounded-4xl border border-(--color-line) bg-[#f3eadf] p-5 shadow-(--shadow-card)">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--color-muted)">
              Uso diario
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-(--color-ink)">
              <p>1. Revisa primero el dashboard.</p>
              <p>2. Luego registra clientes, ingresos y egresos.</p>
              <p>3. Usa el resumen mensual para controlar utilidad y costos.</p>
            </div>
          </article>
        </aside>

        <div className="grid gap-6">{children}</div>
      </section>
    </main>
  );
}
