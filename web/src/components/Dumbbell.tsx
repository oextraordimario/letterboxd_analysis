import type { Film, Member } from "@/lib/report";
import { fmt, signed, stars } from "@/lib/format";

const MIN = 0.5;
const MAX = 5;
const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;

/** Nota do grupo vs. média do Letterboxd, um filme por linha, escala 0,5–5. */
export function Dumbbell({ films, members }: { films: Film[]; members: Member[] }) {
  const names = Object.fromEntries(members.map((m) => [m.username, m.display_name]));
  return (
    <figure className="dumbbell">
      <div className="legend" aria-hidden>
        <span><i className="dot dot-group" /> Média do grupo</span>
        <span><i className="dot dot-site" /> Média do Letterboxd</span>
      </div>
      <div className="dumbbell-axis" aria-hidden>
        <span />
        <span className="dumbbell-scale">
          {[1, 2, 3, 4, 5].map((t) => (
            <span key={t} style={{ left: `${pct(t)}%` }}>{t}★</span>
          ))}
        </span>
        <span />
      </div>
      <ol>
        {films.map((f) => {
          const g = f.group_avg ?? 0;
          const lo = Math.min(g, f.lbxd_avg);
          const hi = Math.max(g, f.lbxd_avg);
          return (
            <li key={f.slug} tabIndex={0}>
              <a className="dumbbell-title" href={f.url} target="_blank" rel="noreferrer">
                {f.title} <small>{f.year}</small>
              </a>
              <span className="dumbbell-track">
                {[1, 2, 3, 4, 5].map((t) => (
                  <span key={t} className="gridline" style={{ left: `${pct(t)}%` }} />
                ))}
                <span className="dumbbell-span" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
                <span className="dot dot-site" style={{ left: `${pct(f.lbxd_avg)}%` }} />
                <span className="dot dot-group" style={{ left: `${pct(g)}%` }} />
              </span>
              <span className={`dumbbell-diff ${(f.diff_vs_lbxd ?? 0) >= 0 ? "up" : "down"}`}>
                {signed(f.diff_vs_lbxd ?? 0)}
              </span>
              <span className="tip" role="tooltip">
                <strong>{f.title}</strong>
                <span>Grupo {fmt(g, 2)} · Letterboxd {fmt(f.lbxd_avg, 2)}</span>
                <span className="tip-ratings">
                  {Object.entries(f.ratings)
                    .filter(([, r]) => r != null)
                    .map(([u, r]) => (
                      <span key={u}>
                        {names[u]} <b>{stars(r)}</b>
                      </span>
                    ))}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
