const navigationSections = [
  {
    title: "Dashboard",
    defaultOpen: true,
    links: [
      { href: "/", label: "Resumen general" },
      { href: "/pacientes", label: "Clientes" },
    ],
  },
  {
    title: "Movimientos financieros",
    links: [
      { href: "/ingresos", label: "Ingresos" },
      { href: "/egresos", label: "Egresos" },
      { href: "/reportes", label: "Reportes" },
    ],
  },
];

export function ClinicNavigation() {
  return (
    <div className="grid gap-3">
      {navigationSections.map((section) => (
        <details
          key={section.title}
          className="rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
          open={section.defaultOpen}
        >
          <summary className="cursor-pointer text-sm font-semibold text-white">
            {section.title}
          </summary>
          <div className="mt-3 grid gap-2 text-sm">
            {section.links.map((link) => (
              <a
                key={`${section.title}-${link.href}`}
                href={link.href}
                className="rounded-2xl border border-white/8 bg-white/8 px-3 py-2 text-white/88"
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
