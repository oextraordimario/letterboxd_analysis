"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

export type CompareItem = { label: string; value: number; prev: number };
export type CompareList = { caption: string; items: CompareItem[] };

/**
 * Listas de barras horizontais com um botão que divide cada barra em duas partes empilhadas:
 * o que já existia na última apresentação e o que entrou desde então.
 */
export function CompareBars({ lists, previousLabel, columns = 2 }: { lists: CompareList[]; previousLabel: string; columns?: number }) {
  const [compare, setCompare] = useState(false);
  return (
    <div className={`compare-bars${compare ? " is-comparing" : ""}`}>
      <div className="columns-head">
        <button type="button" className="compare-toggle" aria-pressed={compare} onClick={() => setCompare((c) => !c)}>
          {compare ? "Esconder" : "Comparar com"} {previousLabel}
        </button>
        <div className="legend" aria-hidden={!compare}>
          <span><i className="swatch swatch-prev" /> {previousLabel}</span>
          <span><i className="swatch swatch-now" /> desde então</span>
        </div>
      </div>
      <div className={columns === 2 ? "two-col" : ""}>
        {lists.map((list) => {
          const max = Math.max(...list.items.map((i) => i.value), 1);
          return (
            <figure key={list.caption} className="barlist">
              <figcaption>{list.caption}</figcaption>
              <ol>
                {list.items.map((item) => {
                  const delta = item.value - item.prev;
                  return (
                    <li key={item.label} tabIndex={0} title={`${item.label}: ${fmt(item.value)} (${previousLabel}: ${fmt(item.prev)})`}>
                      <span className="barlist-label">
                        {item.label}
                        {item.prev === 0 && <em className="compare-new">novo!</em>}
                      </span>
                      <span className="barlist-track">
                        <span className="bar-area">
                          <span className="barlist-bar stack" style={{ width: `${(item.value / max) * 100}%` }}>
                            <span className="stack-prev" style={{ width: `${item.value ? (Math.min(item.prev, item.value) / item.value) * 100 : 0}%` }} />
                            <span className="stack-new" />
                          </span>
                        </span>
                        <span className="barlist-value">
                          {fmt(item.value)}
                          {delta > 0 && <small className="compare-delta"> ({fmt(item.prev)} + {fmt(delta)})</small>}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
