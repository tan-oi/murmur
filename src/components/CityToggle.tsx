import { CITIES } from "#/lib/cities";

/**
 * City picker pills, top-left, quiet paper style. Only Kolkata exists
 * today; other cities render disabled ("soon") so the toggle doesn't
 * need rebuilding when a second city lands.
 */
export function CityToggle({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute top-6 left-6 flex gap-1.5 rounded-sm border-2 border-shell-deep/70 bg-paper p-1">
      {CITIES.map((city) => (
        <button
          key={city.id}
          onClick={() => onSelect(city.id)}
          aria-pressed={activeId === city.id}
          className={`cursor-pointer rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            activeId === city.id
              ? "bg-inkbrown text-paper"
              : "text-shell hover:bg-paper-dim"
          }`}
        >
          {city.name}
        </button>
      ))}
      <span className="cursor-not-allowed rounded-sm px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-shell/40">
        more soon
      </span>
    </div>
  );
}
