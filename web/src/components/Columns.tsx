import { fmt } from "@/lib/format";

type Item = { label: string; value: number };

/** Colunas verticais, uma série, com o valor em cima de cada barra. */
export function Columns({ items, unit = "filmes" }: { items: Item[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <figure className="columns">
      <ol style={{ "--n": items.length } as React.CSSProperties}>
        {items.map((item) => (
          <li key={item.label} tabIndex={0} title={`${item.label} · ${fmt(item.value)} ${item.value === 1 ? unit.replace(/s$/, "") : unit}`}>
            <span className="columns-plot">
              <span className="columns-bar" style={{ height: `${(item.value / max) * 100}%` }}>
                <span className="columns-value">{fmt(item.value)}</span>
              </span>
            </span>
            <span className="columns-label">{item.label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
