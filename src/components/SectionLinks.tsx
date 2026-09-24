import { requestOpenSection } from "../lib/section";

/** Local contents belong inside their page, not beside it in the global menu. */
export default function SectionLinks({
  label,
  items,
}: {
  label: string;
  items: { id: string; label: string }[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/70 p-3"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:border-gold hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-gold"
          onClick={(event) => {
            event.preventDefault();
            const section = document.getElementById(item.id);
            if (!section) return;
            requestOpenSection(item.id);
            requestAnimationFrame(() =>
              section.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              }),
            );
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
