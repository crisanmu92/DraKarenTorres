"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  icon: (active: boolean) => React.JSX.Element;
};

function DashboardIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.25 9.75v10.5A1.5 1.5 0 0 0 6.75 21.75h10.5a1.5 1.5 0 0 0 1.5-1.5V9.75" />
      <path d="M9.75 21.75v-6h4.5v6" />
    </svg>
  );
}

function PatientsIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 20.25v-1.5a3.75 3.75 0 0 0-3.75-3.75h-4.5a3.75 3.75 0 0 0-3.75 3.75v1.5" />
      <circle cx="9.75" cy="7.5" r="3.75" />
      <path d="M20.25 20.25v-1.5a3.75 3.75 0 0 0-2.25-3.431" />
      <path d="M15.75 3.994a3.75 3.75 0 0 1 0 7.012" />
    </svg>
  );
}

function SuppliersIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.75 20.25h16.5" />
      <path d="M5.25 20.25V8.25l6.75-4.5 6.75 4.5v12" />
      <path d="M9 20.25v-6h6v6" />
      <path d="M8.25 9.75h.008v.008H8.25z" />
      <path d="M12 9.75h.008v.008H12z" />
      <path d="M15.75 9.75h.008v.008h-.008z" />
    </svg>
  );
}

function InventoryIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5 12 3.75 19.5 7.5 12 11.25 4.5 7.5Z" />
      <path d="M4.5 12 12 15.75 19.5 12" />
      <path d="M4.5 16.5 12 20.25 19.5 16.5" />
      <path d="M4.5 7.5v9" />
      <path d="M19.5 7.5v9" />
    </svg>
  );
}

function ServicesIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6.75h15" />
      <path d="M6.75 6.75v10.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V6.75" />
      <path d="M9 3.75v3" />
      <path d="M15 3.75v3" />
      <path d="M9 11.25h6" />
    </svg>
  );
}

function MovementsIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6.75h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 17.25h9.75" />
      <path d="m15.75 15 3.75-3.75L15.75 7.5" />
    </svg>
  );
}

function ProfitabilityIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5 9.75 11.25l3.75 3.75 6-7.5" />
      <path d="M15.75 7.5h3.75v3.75" />
      <path d="M4.5 20.25h15" />
    </svg>
  );
}

function ExportIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={`h-7 w-7 ${active ? "text-white" : "text-[#4b5567]"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.75v10.5" />
      <path d="m8.25 10.5 3.75 3.75 3.75-3.75" />
      <path d="M4.5 15.75v2.25a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 19.5 18v-2.25" />
    </svg>
  );
}

const links: NavLink[] = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/pacientes", label: "Pacientes", icon: PatientsIcon },
  { href: "/proveedores", label: "Proveedores", icon: SuppliersIcon },
  { href: "/inventario", label: "Inventario", icon: InventoryIcon },
  { href: "/servicios", label: "Servicios", icon: ServicesIcon },
  { href: "/movimientos", label: "Movimientos", icon: MovementsIcon },
  { href: "/rentabilidad", label: "Rentabilidad", icon: ProfitabilityIcon },
  { href: "/export", label: "Descargar Excel", icon: ExportIcon },
];

export function ClinicNavigation() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-3">
      {links.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-17 items-center gap-4 rounded-[24px] px-5 py-4 text-[1.05rem] font-semibold transition ${
              active
                ? "bg-[#2f5be7] text-white shadow-[0_16px_30px_rgba(47,91,231,0.28)]"
                : "text-[#364152] hover:bg-[#f1f5ff]"
            }`}
          >
            <span className="shrink-0">{link.icon(active)}</span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
