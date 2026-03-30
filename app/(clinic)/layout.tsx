import type { ReactNode } from "react";
import Link from "next/link";

import { ClinicNavigation } from "@/components/clinic/navigation";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto grid min-h-screen w-full max-w-[1560px] gap-0 lg:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="border-r border-[#dbe4f0] bg-[#fcfdff] px-4 py-5 sm:px-6 lg:min-h-screen lg:px-6 lg:py-7">
          <Link
            href="/"
            className="mb-7 block rounded-[32px] border border-[#e4ebf5] bg-white px-6 py-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f5ff] text-[#dce8ff]">
                <span className="text-4xl leading-none">$</span>
              </div>
              <div className="min-w-0">
                <p className="font-display text-[2.45rem] leading-[0.95] tracking-[-0.05em] text-[#2f5be7]">
                  Dra. Karen Torres
                </p>
                <p className="mt-3 text-[0.76rem] font-semibold uppercase tracking-[0.22em] text-[#7c8698]">
                  Medica profesional en medicina estetica
                </p>
              </div>
            </div>
          </Link>

          <article className="rounded-[32px] border border-[#e4ebf5] bg-white p-6 shadow-[0_18px_44px_rgba(148,163,184,0.10)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#96a0b2]">
              Menu
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#1f2937]">
              Panel principal
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6b7280]">
              Navegacion principal para registrar pacientes, proveedores, servicios y movimientos.
            </p>
            <div className="mt-7">
              <ClinicNavigation />
            </div>
          </article>

          <article className="mt-5 rounded-[32px] border border-[#dbe7ff] bg-[#f5f8ff] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2f5be7]">
              Flujo recomendado
            </p>
            <div className="mt-5 grid gap-4 text-base leading-7 text-[#516074]">
              <p>1. Registra primero pacientes y proveedores.</p>
              <p>2. Luego crea servicios e inventario.</p>
              <p>3. Controla ingresos y egresos en movimientos.</p>
            </div>
          </article>
        </aside>

        <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</div>
      </section>
    </main>
  );
}
