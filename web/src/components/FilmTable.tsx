"use client";

import { useMemo, useState } from "react";
import type { Film, Member } from "@/lib/report";
import { date, fmt, signed } from "@/lib/format";

type Key = "position" | "title" | "year" | "lbxd_avg" | "group_avg" | "diff_vs_lbxd" | string;

/** Tabela completa: todos os filmes, notas de cada membro, ordenável. */
export function FilmTable({ films, members }: { films: Film[]; members: Member[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "position", dir: -1 });
  const [onlyNew, setOnlyNew] = useState(false);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const value = (f: Film): number | string | null => {
      if (sort.key in f.ratings) return f.ratings[sort.key];
      return (f as unknown as Record<string, number | string | null>)[sort.key];
    };
    const q = query.trim().toLowerCase();
    return films
      .filter((f) => (!onlyNew || !f.presented) && (!q || f.title.toLowerCase().includes(q)))
      .toSorted((a, b) => {
        const va = value(a);
        const vb = value(b);
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [films, sort, onlyNew, query]);

  const header = (key: Key, label: string, className = "") => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "title" ? 1 : -1 }))}
      >
        {label}
        <span aria-hidden>{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="filmtable">
      <div className="filmtable-controls">
        <input type="search" placeholder="Buscar filme…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar filme" />
        <label>
          <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> Só os da temporada nova
        </label>
        <span className="muted">{rows.length} filmes</span>
      </div>
      <div className="filmtable-scroll">
        <table>
          <thead>
            <tr>
              {header("position", "#", "num")}
              {header("title", "Filme")}
              {header("watched_date", "Sessão")}
              {members.map((m) => header(m.username, m.display_name, "num"))}
              {header("group_avg", "Grupo", "num")}
              {header("lbxd_avg", "Letterboxd", "num")}
              {header("diff_vs_lbxd", "Diferença", "num")}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.slug} className={f.presented ? "" : "is-new"}>
                <td className="num muted">{f.position}</td>
                <td>
                  <a href={f.url} target="_blank" rel="noreferrer">{f.title}</a> <small className="muted">{f.year}</small>
                </td>
                <td className="muted nowrap">{date(f.watched_date)}</td>
                {members.map((m) => (
                  <td key={m.username} className="num">{f.ratings[m.username] != null ? fmt(f.ratings[m.username]!, 1) : <span className="muted">·</span>}</td>
                ))}
                <td className="num strong">{f.group_avg != null ? fmt(f.group_avg, 2) : "—"}</td>
                <td className="num">{fmt(f.lbxd_avg, 2)}</td>
                <td className={`num ${(f.diff_vs_lbxd ?? 0) >= 0 ? "up" : "down"}`}>{f.diff_vs_lbxd != null ? signed(f.diff_vs_lbxd) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
