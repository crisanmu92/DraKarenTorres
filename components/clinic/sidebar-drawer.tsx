"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ClinicNavigation } from "@/components/clinic/navigation";

export function SidebarDrawer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <section className="relative mx-auto min-h-screen w-full max-w-[1560px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex items-center gap-3 rounded-full border border-[#dbe4f0] bg-white/96 px-5 py-3 text-sm font-semibold text-[#1f2937] shadow-[0_14px_32px_rgba(15,23,42,0.12)] backdrop-blur sm:left-6 sm:top-6"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3ff] text-[#2f5be7]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4.5 7.5h15" />
            <path d="M4.5 12h15" />
            <path d="M4.5 16.5h15" />
          </svg>
        </span>
        Menu
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#0f172a]/28 backdrop-blur-[2px]"
          />

          <aside className="absolute left-0 top-0 h-full w-[min(24rem,92vw)] overflow-y-auto border-r border-[#dbe4f0] bg-[#fcfdff] px-4 py-5 sm:px-6 lg:px-6 lg:py-7">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="block rounded-[32px] border border-[#e4ebf5] bg-white px-6 py-6"
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

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dbe4f0] bg-white text-[#475467]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="m6.75 6.75 10.5 10.5" />
                  <path d="M17.25 6.75 6.75 17.25" />
                </svg>
              </button>
            </div>

            <article className="mt-7 rounded-[32px] border border-[#e4ebf5] bg-white p-6 shadow-[0_18px_44px_rgba(148,163,184,0.10)]">
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
        </div>
      ) : null}

      <div className="grid gap-6 px-4 pb-5 pt-24 sm:px-6 sm:pb-6 sm:pt-28 lg:px-8 lg:pb-7 lg:pt-28">
        {children}
      </div>
    </section>
  );
}
