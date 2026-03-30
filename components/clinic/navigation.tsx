const navigationSections = [
  {
    title: "Dashboard",
    defaultOpen: true,
    links: [
      { href: "/", label: "Resumen general" },
      { href: "/pacientes", label: "Pacientes" },
    ],
  },
  {
    title: "Caja",
    links: [
      { href: "/ingresos", label: "Ingresos" },
      { href: "/egresos", label: "Egresos" },
    ],
  },
  {
    title: "Abastecimiento",
    links: [
      { href: "/proveedores", label: "Proveedores" },
      { href: "/inventario", label: "Inventario" },
    ],
  },
];

export function ClinicNavigation() {
  return (
    <div className="grid gap-3">
      {navigationSections.map((section) => (
        <details
          key={section.title}
          className="rounded-3xl border border-(--color-line) bg-[var(--color-panel)]/50 px-4 py-3"
          open={section.defaultOpen}
        >
          <summary className="cursor-pointer text-sm font-semibold text-(--color-ink)">
            {section.title}
          </summary>
          <div className="mt-3 grid gap-2 text-sm">
            {section.links.map((link) => (
              <a
                key={`${section.title}-${link.href}`}
                href={link.href}
                className="rounded-2xl bg-white/90 px-3 py-2 text-(--color-ink)"
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
