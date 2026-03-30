const navigationSections = [
  {
    title: "Opciones",
    defaultOpen: true,
    links: [
      { href: "/pacientes", label: "Registro de pacientes" },
      { href: "/proveedores", label: "Registro de proveedores" },
      { href: "/inventario", label: "Inventario" },
      { href: "/servicios", label: "Servicios" },
      { href: "/movimientos", label: "Movimientos" },
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
