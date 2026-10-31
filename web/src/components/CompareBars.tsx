"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

export type CompareItem = { label: string; value: number; prev: number };
export type CompareList = { caption: string; items: CompareItem[] };

/**
 * Listas de barras horizontais com um botão que mostra, sob cada barra, a barra da
 * última apresentação (mesma escala por lista) e quanto cresceu.
 */
export function CompareBars({ lists, previousLabel }: { lists: CompareList[]; previousLabel: string }) {
  const [compare, setCompare] = useState(false);
  return (
    <div className={`compare-bars${compare ? " is-comparing" : ""}`}>
      <div className="columns-head">
        <button type="button" className="compare-toggle" aria-pressed={compare} onClick={() => setCompare((c) => !c)}>
          {compare ? "Esconder" : "Comparar com"} {previousLabel}
        </button>
        <div className="legend" aria-hidden={!compare}>
          <span><i className="swatch swatch-prev" /> {previousLabel}</span>
          <span><i className="swatch swatch-now" /> agora</span>
        </div>
      </div>
      <div className="two-col">
        {lists.map((list) => {
          const max = Math.max(...list.items.map((i) => Math.max(i.value, i.prev)), 1);
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
                      <span className="compare-tracks">
                        <span className="barlist-track">
                          <span className="barlist-bar" style={{ width: `${(item.value / max) * 100}%` }} />
                          <span className="barlist-value">
                            {fmt(item.value)}
                            {delta > 0 && <small className="compare-delta"> +{fmt(delta)}</small>}
                          </span>
                        </span>
                        <span className="barlist-track compare-prev">
                          <span className="barlist-bar" style={{ width: `${(item.prev / max) * 100}%` }} />
                          <span className="barlist-value">{fmt(item.prev)}</span>
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
