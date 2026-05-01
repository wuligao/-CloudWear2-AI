import type { OutfitItem } from "@/types/outfit";

interface OutfitItemsProps {
  items: OutfitItem[];
}

export function OutfitItems({ items }: OutfitItemsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-black/10 bg-white p-4 text-sm leading-6 text-[var(--muted)]">
        本次暂无单品拆解。
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <article
          className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
          key={`${item.category}-${item.name}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            {item.category}
          </p>
          <h3 className="mt-2 text-base font-semibold">{item.name}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {item.color} / {item.material}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            {item.reason}
          </p>
        </article>
      ))}
    </div>
  );
}
