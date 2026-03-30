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
    <div className="grid gap-4">
      {navigationSections.map((section) => (
        <details
          key={section.title}
          className="rounded-[30px] border border-white/10 bg-white/5 px-5 py-4"
          open={section.defaultOpen}
        >
          <summary className="cursor-pointer text-lg font-semibold tracking-[-0.02em] text-white">
            {section.title}
          </summary>
          <div className="mt-4 grid gap-3">
            {section.links.map((link) => (
              <a
                key={`${section.title}-${link.href}`}
                href={link.href}
                className="rounded-[24px] border border-white/10 bg-white/9 px-4 py-4 text-base font-medium leading-6 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      ))}

      <a
        href="/export"
        className="rounded-[24px] border border-[#c9a977]/30 bg-[#f4e6d1] px-4 py-4 text-base font-semibold leading-6 text-[#3f2d1f]"
      >
        Descargar Excel
      </a>
    </div>
  );
}
