"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

type Item = { label: string; value: number };

/**
 * Colunas verticais com o valor em cima de cada barra. Com `previous`, mostra um botão que
 * divide cada coluna em duas partes empilhadas: a última apresentação e o que entrou desde então.
 */
export function Columns({
  items,
  previous,
  previousLabel = "última apresentação",
  unit = "filmes",
}: {
  items: Item[];
  previous?: Item[];
  previousLabel?: string;
  unit?: string;
}) {
  const [compare, setCompare] = useState(false);
  const prevBy = Object.fromEntries((previous ?? []).map((i) => [i.label, i.value]));
  const max = Math.max(...items.map((i) => i.value), 1);
  const u = (v: number) => (v === 1 ? unit.replace(/s$/, "") : unit);

  return (
    <figure className={`columns${compare ? " is-comparing" : ""}`}>
      {previous && (
        <div className="columns-head">
          <button type="button" className="compare-toggle" aria-pressed={compare} onClick={() => setCompare((c) => !c)}>
            {compare ? "Esconder" : "Comparar com"} {previousLabel}
          </button>
          <div className="legend" aria-hidden={!compare}>
            <span><i className="swatch swatch-prev" /> {previousLabel}</span>
            <span><i className="swatch swatch-now" /> desde então</span>
          </div>
        </div>
      )}
      <ol style={{ "--n": items.length } as React.CSSProperties}>
        {items.map((item) => {
          const prev = prevBy[item.label] ?? 0;
          const delta = item.value - prev;
          return (
            <li
              key={item.label}
              className={previous && prev === 0 && item.value > 0 ? "is-filled" : undefined}
              tabIndex={0}
              title={`${item.label} · ${fmt(item.value)} ${u(item.value)}${previous ? ` (${previousLabel}: ${fmt(prev)})` : ""}`}
            >
              <span className="columns-plot">
                <span className="columns-bar stack" style={{ height: `${(item.value / max) * 100}%` }}>
                  <span className="stack-new" />
                  {previous && <span className="stack-prev" style={{ height: `${item.value ? (Math.min(prev, item.value) / item.value) * 100 : 0}%` }} />}
                  <span className="columns-value">
                    {fmt(item.value)}
                    {previous && delta > 0 && <small className="columns-delta">{fmt(prev)} + {fmt(delta)}</small>}
                  </span>
                </span>
              </span>
              <span className="columns-label">
                {item.label}
                {previous && prev === 0 && item.value > 0 && <span className="columns-filled">preenchida!</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
