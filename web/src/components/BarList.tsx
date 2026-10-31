import { fmt } from "@/lib/format";

type Item = { label: string; value: number; hint?: string };

/** Barras horizontais ranqueadas, uma série, rótulo de valor em cada barra. */
export function BarList({ items, unit = "filmes", caption, max: maxProp }: { items: Item[]; unit?: string; caption?: string; max?: number }) {
  const max = maxProp ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <figure className="barlist">
      {caption && <figcaption>{caption}</figcaption>}
      <ol>
        {items.map((item) => (
          <li key={item.label} tabIndex={0}>
            <span className="barlist-label">{item.label}</span>
            <span className="barlist-track">
              <span className="barlist-bar" style={{ width: `${(item.value / max) * 100}%` }} />
              <span className="barlist-value">{fmt(item.value)}</span>
            </span>
            <span className="tip" role="tooltip">
              <strong>{item.label}</strong> · {fmt(item.value)} {item.value === 1 ? unit.replace(/s$/, "") : unit}
              {item.hint && <em>{item.hint}</em>}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
