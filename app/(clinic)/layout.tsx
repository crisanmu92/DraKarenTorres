import type { ReactNode } from "react";
import Link from "next/link";

import { ClinicNavigation } from "@/components/clinic/navigation";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto grid min-h-screen w-full max-w-[1560px] gap-0 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="border-r border-white/8 bg-[#0f172a] px-4 py-5 sm:px-6 lg:min-h-screen lg:px-6 lg:py-7">
          <Link
            href="/"
            className="mb-5 block rounded-[32px] border border-[#e8d8c2]/24 bg-[linear-gradient(180deg,rgba(255,250,244,0.12),rgba(255,255,255,0.04))] px-6 py-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#e9dccb]/45 bg-[#f6ede1] text-[#1f1720]">
                <span className="font-display text-3xl leading-none">K</span>
              </div>
              <div className="min-w-0">
                <p className="font-display text-[2.15rem] leading-none tracking-[-0.04em] text-white">
                  Dra. Karen Torres
                </p>
                <p className="mt-2 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-[#e7d8c5]/78">
                  Medica profesional en medicina estetica
                </p>
              </div>
            </div>
          </Link>

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
