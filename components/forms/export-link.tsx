type ExportLinkProps = {
  section: string;
  label?: string;
};

export function ExportLink({
  section,
  label = "Descargar Excel",
}: ExportLinkProps) {
  return (
    <a
      href={`/export?section=${encodeURIComponent(section)}`}
      className="inline-flex items-center justify-center rounded-full border border-[#dbe4f0] bg-white px-5 py-3 text-sm font-semibold text-[#1f2937] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
    >
      {label}
    </a>
  );
}
