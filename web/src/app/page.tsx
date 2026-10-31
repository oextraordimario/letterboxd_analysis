import { BarList } from "@/components/BarList";
import { Columns } from "@/components/Columns";
import { Deck } from "@/components/Deck";
import { Dumbbell } from "@/components/Dumbbell";
import { FilmTable } from "@/components/FilmTable";
import { Goals, type Goal } from "@/components/Goals";
import { Reveal } from "@/components/Reveal";
import { countryPt, date, fmt, genrePt, languagePt, monthYear, signed, stars } from "@/lib/format";
import { loadReport, type Film, type Person } from "@/lib/report";

const r = loadReport();
const bySlug = Object.fromEntries(r.films.map((f) => [f.slug, f]));
const newFilms = r.films.filter((f) => !f.presented);
const since = r.since_last_presentation;

function topPeople(people: Person[], topN = 3, maxTotal = 6) {
  if (people.length <= topN) return people;
  const cutoff = people[topN - 1].movie_count;
  const tied = people.filter((p) => p.movie_count >= cutoff);
  return tied.length <= maxTotal ? tied : people.slice(0, maxTotal);
}

/** Um slide de tela cheia. Filhos com `.reveal` entram em sequência quando o slide fica ativo. */
function Slide({
  id,
  title,
  lede,
  className = "",
  children,
}: {
  id: string;
  title?: string;
  lede?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={`slide ${className}`}>
      <div className="slide-inner">
        {title && (
          <header className="section-head reveal">
            <h2>{title}</h2>
            {lede && <p className="lede">{lede}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="stat">
      <span className={`stat-value${/^[\d.,\s]+$/.test(value) ? "" : " is-text"}`}>{value}</span>
      <span className="stat-label">{label}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

function People({ people }: { people: Person[] }) {
  return (
    <div className="people-grid reveal">
      {topPeople(people).map((p) => (
        <a key={p.link} className="person" href={p.url} target="_blank" rel="noreferrer">
          <span className="person-photo">
            {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <span className="person-initial">{p.name[0]}</span>}
          </span>
          <span className="person-count">{p.movie_count}</span>
          <span className="person-name">{p.name}</span>
          <span className="person-films">{p.films.join(" · ")}</span>
        </a>
      ))}
    </div>
  );
}

/** Nota como número + estrela ("4,5★"); a fonte display não tem o glifo ★ desenhado em sequência. */
const starNum = (v: number, digits?: number) => `${fmt(v, digits ?? (Number.isInteger(v) ? 0 : 1))}★`;

function Likers({ usernames }: { usernames: string[] }) {
  return (
    <span className="likers">
      {usernames.map((u) => {
        const mm = r.members.find((x) => x.username === u);
        return mm ? <span key={u} title={mm.display_name}><Avatar url={mm.avatar_url} name={mm.display_name} /></span> : null;
      })}
    </span>
  );
}

function Avatar({ url, name }: { url: string; name: string }) {
  return <span className="avatar">{url ? <img src={url} alt="" /> : <span>{name[0]}</span>}</span>;
}

/** Silhueta de estatueta (tipo Oscar), desenhada à mão. */
function Statuette() {
  return (
    <svg className="statuette" viewBox="0 0 24 64" aria-hidden>
      <circle cx="12" cy="5.5" r="3.6" />
      <path d="M7.6 11.2Q12 8.6 16.4 11.2L15.4 22Q14.6 33 15 44H9Q9.4 33 8.6 22Z" />
      <path d="M7 44h10v3H7zM5 47.5h14v3H5zM6 51h12v10H6z" />
    </svg>
  );
}

// Rótulos dos slides, na ordem em que aparecem (navegação lateral).
const LABELS = [
  "Abertura",
  "Resumo",
  "Temporada nova",
  "Premiações pt1",
  "Premiações pt2",
  "Os queridinhos",
  "Notas: os dados",
  "Os esquecidos",
  "Clima tenso: premiações",
  "Clima tenso: os dados",
  "Nem fede nem cheira",
  "#OpiniãoImpopular",
  "Impopular: os dados",
  "Intervalo",
  "Metas",
  "Números",
  "Décadas",
  "Atores e atrizes",
  "Direção",
  "Roteiro",
  "Países e idiomas",
  "Gêneros",
  "Temas",
  "Próxima temporada",
  "Todos os filmes",
];

export default function Home() {
  const m = r.metrics;
  const splits = r.divergence.splits.map((s) => bySlug[s]);
  const brazil = r.countries.find((c) => c.country === "Brazil")?.movie_count ?? 0;
  const fewestDecade = [...r.decades].sort((a, b) => a.movie_count - b.movie_count)[0];
  const cage = r.people.actors.find((p) => p.name === "Nicolas Cage")?.movie_count ?? 0;
  const byAvg = [...r.members].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  const generous = byAvg[0];
  const harsh = byAvg[byAvg.length - 1];
  // Desvio padrão (amostral) das notas de cada membro nos filmes da lista.
  const memberStd = Object.fromEntries(
    r.members.map((mm) => {
      const v = r.films.map((f) => f.ratings[mm.username]).filter((x): x is number => x != null);
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      return [mm.username, Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1))];
    }),
  );
  const byStd = [...r.members].sort((a, b) => memberStd[a.username] - memberStd[b.username]);
  const steady = byStd[0];
  const swingy = byStd[byStd.length - 1];
  const byUser = Object.fromEntries(r.members.map((mm) => [mm.username, mm]));
  const softie = [...r.members].sort((a, b) => b.films_liked - a.films_liked)[0];
  const mostLiked = [...r.films].sort((a, b) => b.like_count - a.like_count || b.lbxd_rating_count - a.lbxd_rating_count)[0];
  const runnersUp = r.films.filter((f) => f !== mostLiked && f.like_count === 2);
  // Metas/sugestões da última apresentação (legacy/streamlit_app.py) e o que aconteceu desde então.
  const prevCount = <T extends { movie_count: number }>(list: T[], pick: (x: T) => boolean) => list.find(pick)?.movie_count ?? 0;
  const presentedTitles = new Set(r.films.filter((f) => f.presented).map((f) => f.title));
  const cagePerson = r.people.actors.find((p) => p.name === "Nicolas Cage");
  const cageThen = cagePerson ? cagePerson.films.filter((t) => presentedTitles.has(t)).length : 0;
  const cageNow = cagePerson?.movie_count ?? 0;
  const decadeThen = (d: number) => prevCount(r.previous.decades, (x) => x.release_decade === d);
  const decadeNow = (d: number) => prevCount(r.decades, (x) => x.release_decade === d);
  const brThen = prevCount(r.previous.countries, (c) => c.country === "Brazil");
  const brNow = prevCount(r.countries, (c) => c.country === "Brazil");
  const musicThen = prevCount(r.previous.genres_all, (g) => g.genre === "Music");
  const musicNow = prevCount(r.genres_all, (g) => g.genre === "Music");
  const goals: Goal[] = [
    {
      text: "Um filme da década de 30 e um da década de 60, já que são as únicas faltando.",
      status: decadeNow(1930) > decadeThen(1930) && decadeNow(1960) > decadeThen(1960) ? "done" : "miss",
      evidence: `anos 30: ${decadeThen(1930)} → ${decadeNow(1930)} · anos 60: ${decadeThen(1960)} → ${decadeNow(1960)}`,
    },
    {
      text: "Dois filmes do Nicolas Cage, para que ele tome seu lugar de direito.",
      status: cageNow - cageThen >= 2 ? "done" : "miss",
      evidence: `${cageThen} → ${cageNow} filmes`,
    },
    { text: "Pelo menos um filme brasileiro pra não dar vexame.", status: brNow > brThen ? "done" : "miss", evidence: `${brThen} → ${brNow}` },
    { text: "Pra valorizar a indústria nacional, mais filmes brasileiros.", status: brNow - brThen > 1 ? "done" : "miss", evidence: `+${brNow - brThen} filmes` },
    { text: "Pra incentivar a igualdade, mais filmes dirigidos por mulheres.", status: "unknown", evidence: "não peguei esse dado" },
    { text: "Mais filmes musicais!", status: musicNow > musicThen ? "done" : "miss", evidence: `${musicThen} → ${musicNow}` },
    { text: "Jhones logar mais filmes!!!", status: "miss", evidence: "nunca mais logou nada" },
  ];
  const forgotten = r.films.filter((f) => f.group_voters < r.min_voters).sort((a, b) => b.group_voters - a.group_voters);
  // Consenso: nota média alta (ou baixa) com pouco desvio. Empate: mais notas, depois mais popular no site.
  const eligible = r.films.filter((f) => f.group_voters >= r.min_voters);
  const tieBreak = (a: Film, b: Film) => b.group_voters - a.group_voters || b.lbxd_rating_count - a.lbxd_rating_count;
  const lovedByAll = [...eligible].sort(
    (a, b) => ((b.group_avg ?? 0) - (b.group_std ?? 0)) - ((a.group_avg ?? 0) - (a.group_std ?? 0)) || tieBreak(a, b),
  )[0];
  const hatedByAll = [...eligible].sort(
    (a, b) => ((a.group_avg ?? 9) + (a.group_std ?? 9)) - ((b.group_avg ?? 9) + (b.group_std ?? 9)) || tieBreak(a, b),
  )[0];
  // "Nem fede nem cheira": todo mundo deu ★★★, ou quase.
  const lukewarm = eligible
    .filter((f) => Math.abs((f.group_avg ?? 0) - 3) <= 0.25 && (f.group_std ?? 9) <= 0.25)
    .sort((a, b) => (a.group_std ?? 0) - (b.group_std ?? 0) || tieBreak(a, b));
  const groupDiff = r.group_avg_overall - r.lbxd_avg_overall_eligible;
  const groupRated = r.films.filter((f) => f.group_voters >= r.min_voters).length;

  return (
    <main>
      <div className="grain" aria-hidden />
      <Deck labels={LABELS} />

      <Slide id="inicio" className="slide-hero">
        <div className="marquee">
          <h1>
            <span>Família</span> <span>Fã de</span> <span>Filmes</span>
          </h1>
          <p className="marquee-bottom">Retrospectiva · {monthYear(r.generated_at.slice(0, 10))}</p>
        </div>
      </Slide>

      <Slide id="resumo" className="opening">
        <div className="hero-numbers reveal">
          <Stat value={fmt(m.movies_watched)} label="filmes" />
          <Stat value={fmt(m.hours_watched, 0)} label="horas de sessão" />
          <Stat value={fmt(m.days_watched, 1)} label="dias inteiros" note="sem pausa pro banheiro" />
          <Stat value={fmt(m.club_age_months / 12, 1)} label="anos de clube" note={`desde ${monthYear(m.club_start)}`} />
          <Stat value={fmt(m.films_per_month, 1)} label="filmes por mês" />
        </div>
        <div className="cast reveal">
          <p className="cast-title">Estrelando</p>
          <ul>
            {r.members.map((mm) => (
              <li key={mm.username}>
                <a href={`https://letterboxd.com/${mm.username}/`} target="_blank" rel="noreferrer">
                  <span className="avatar">
                    {mm.avatar_url ? <img src={mm.avatar_url} alt="" /> : <span>{mm.display_name[0]}</span>}
                  </span>
                  <b>{mm.display_name}</b>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <nav className="toc reveal" aria-label="Seções">
          <a href="#temporada">Temporada nova</a>
          <a href="#notas">Nossas notas</a>
          <a href="#impopular">#OpiniãoImpopular</a>
          <a href="#numeros">Números</a>
          <a href="#atores">Quem mais apareceu</a>
          <a href="#mundo">Países e idiomas</a>
          <a href="#generos">Gêneros</a>
          <a href="#filmes">Todos os filmes</a>
        </nav>
      </Slide>

      <Slide id="temporada" className="slide-season" title="Filmes desde nov/24">
        <div className="stats-row reveal">
          <Stat value={fmt(since.movies_watched)} label="filmes novos" />
          <Stat value={fmt(since.hours_watched, 0)} label="horas vistas" />
          <Stat value={fmt(since.avg_movie_length, 0)} label="min por filme, em média" />
        </div>
        <div className="stats-row reveal">
          <Stat value={since.name_longest_movie} label={`o mais longo · ${since.duration_longest_movie} min`} />
          <Stat value={since.best_lbxd_rating} label={`o mais bem avaliado no site · ${fmt(since.best_lbxd_rating_value, 2)}`} />
        </div>
        <div className="ribbon reveal" style={{ "--n": newFilms.length } as React.CSSProperties}>
          {/* Lista duplicada para o loop horizontal não ter emenda. */}
          <ol className="ribbon-track">
            {[...newFilms, ...newFilms].map((f, i) => (
              <li key={f.slug + i} aria-hidden={i >= newFilms.length || undefined}>
                <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year})`} tabIndex={i >= newFilms.length ? -1 : undefined}>
                  {f.poster_url ? <img src={f.poster_url} alt={f.title} loading="lazy" /> : <span>{f.title}</span>}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </Slide>

      <Slide id="notas" title="Nossas notas: premiações pt1">
        <div className="reveals reveal">
          <Reveal question="Comparação Letterboxd" sub="acima ou abaixo?" variant="group">
            <article className="award award-group">
              <ul className="award-avatars">
                {r.members.map((mm) => (
                  <li key={mm.username}><Avatar url={mm.avatar_url} name={mm.display_name} /></li>
                ))}
              </ul>
              <h3>FFF</h3>
              <p className="award-verdict-value">
                {signed(groupDiff)}
                <small>média vs. Letterboxd</small>
              </p>
              <p className="award-verdict">
                Veredito: <b>{groupDiff < 0 ? "cinéfilos chatos" : "fáceis de agradar"}</b>
              </p>
            </article>
          </Reveal>
          {[
            { q: "Óscar generosidade", sub: "notas mais altas", mm: generous, std: false },
            { q: "Óscar ranzinza", sub: "notas mais baixas", mm: harsh, std: false },
          ].map(({ q, sub, mm, std }) => (
            <Reveal key={q} question={q} sub={sub}>
              <article className="award">
                <Statuette />
                <p className="award-intro">E o Óscar vai para</p>
                <span className="award-photo"><Avatar url={mm.avatar_url} name={mm.display_name} /></span>
                <h3>{mm.display_name}</h3>
                {std ? (
                  <p className="award-avg">
                    ±{fmt(memberStd[mm.username], 2)}
                    <small>desvio padrão das notas</small>
                  </p>
                ) : (
                  <p className="award-avg">
                    {fmt(mm.avg_rating ?? 0, 2)}
                    <small>{signed(mm.avg_diff_vs_group ?? 0)} vs. grupo</small>
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </Slide>

      <Slide id="notas-pt2" title="Nossas notas: premiações pt2">
        <div className="reveals reveal">
          {[
            { q: "Óscar consistente", sub: "notas mais parecidas entre si", mm: steady, value: `±${fmt(memberStd[steady.username], 2)}`, note: "desvio padrão das notas" },
            { q: "Óscar 8 ou 80", sub: "notas mais espalhadas", mm: swingy, value: `±${fmt(memberStd[swingy.username], 2)}`, note: "desvio padrão das notas" },
            { q: "Óscar coração mole", sub: "quem mais curtiu", mm: softie, value: `${softie.films_liked}♥`, note: `de ${softie.films_seen} filmes vistos` },
          ].map(({ q, sub, mm, value, note }) => (
            <Reveal key={q} question={q} sub={sub}>
              <article className="award">
                <Statuette />
                <p className="award-intro">E o Óscar vai para</p>
                <span className="award-photo"><Avatar url={mm.avatar_url} name={mm.display_name} /></span>
                <h3>{mm.display_name}</h3>
                <p className="award-avg">
                  {value}
                  <small>{note}</small>
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Slide>

      <Slide id="queridinhos" title="Os queridinhos" lede="Os filmes que mais levaram coração.">
        <div className="darlings reveal">
          <a className="darling-top" href={mostLiked.url} target="_blank" rel="noreferrer">
            <span className="darling-poster">{mostLiked.poster_url && <img src={mostLiked.poster_url} alt="" />}</span>
            <span className="darling-meta">
              <b>{mostLiked.title}</b>
              <span className="darling-likes">
                {mostLiked.like_count}♥
                <Likers usernames={mostLiked.liked_by} />
              </span>
            </span>
          </a>
          <ol className="darling-rest">
            {runnersUp.map((f) => (
              <li key={f.slug}>
                <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year})`}>
                  <span className="darling-poster">{f.poster_url ? <img src={f.poster_url} alt={f.title} loading="lazy" /> : <span>{f.title}</span>}</span>
                </a>
                <Likers usernames={f.liked_by} />
              </li>
            ))}
          </ol>
        </div>
      </Slide>

      <Slide id="dados" title="Nossas notas: os dados">
        <div className="tickets reveal">
          <article className="ticket ticket-group">
            <header>
              <h3>FFF</h3>
            </header>
            <p className="ticket-avg">
              {fmt(r.group_avg_overall, 2)}
              <small>nota média do grupo</small>
            </p>
            <dl>
              <div><dt>Filmes avaliados</dt><dd>{groupRated} de {m.movies_watched}</dd></div>
              <div><dt>Vs. Letterboxd</dt><dd>{signed(r.group_avg_overall - r.lbxd_avg_overall_eligible)}</dd></div>
              <div><dt>Filmes curtidos</dt><dd>{r.films.filter((f) => f.like_count > 0).length} de {m.movies_watched}♥</dd></div>
            </dl>
          </article>
          {r.members.map((mm) => (
            <article key={mm.username} className="ticket">
              <header>
                <h3>{mm.display_name}</h3>
              </header>
              <p className="ticket-avg">
                {fmt(mm.avg_rating ?? 0, 2)}
                <small>nota média</small>
              </p>
              <dl>
                <div><dt>Filmes da lista</dt><dd>{mm.films_seen} de {m.movies_watched}</dd></div>
                <div><dt>Vs. grupo</dt><dd>{signed(mm.avg_diff_vs_group ?? 0)}</dd></div>
                <div><dt>Desvio padrão</dt><dd>±{fmt(memberStd[mm.username], 2)}</dd></div>
                <div><dt>Filmes curtidos</dt><dd>{mm.films_liked}♥</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </Slide>

      <Slide id="esquecidos" title="Os esquecidos" lede={`Filmes com menos de ${r.min_voters} avaliações.`}>
        <ol className="forgotten reveal">
          {forgotten.map((f) => {
            const raters = r.members.filter((mm) => f.ratings[mm.username] != null);
            return (
              <li key={f.slug}>
                <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year})`}>
                  {f.poster_url ? <img src={f.poster_url} alt="" loading="lazy" /> : <span className="forgotten-blank">{f.title}</span>}
                </a>
                <span className="forgotten-title">{f.title}</span>
                <span className="forgotten-raters">
                  {raters.map((mm) => (
                    <span key={mm.username} title={`${mm.display_name}: ${stars(f.ratings[mm.username])}`}>
                      <Avatar url={mm.avatar_url} name={mm.display_name} />
                    </span>
                  ))}
                  <small>{raters.length} de {r.members.length}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </Slide>

      <Slide id="racharam" title="Clima tenso (ou não): premiações">
        <div className="reveals reveal">
          {[
            { q: "Óscar discórdia", sub: "maior divergência entre nós", f: splits[0] },
            { q: "Óscar amor unânime", sub: "todo mundo deu nota alta", f: lovedByAll },
            { q: "Óscar ódio unânime", sub: "todo mundo deu nota baixa", f: hatedByAll },
          ].map(({ q, sub, f }) => {
            const vals = Object.values(f.ratings).filter((v): v is number => v != null);
            const lo = Math.min(...vals);
            const hi = Math.max(...vals);
            return (
              <Reveal key={q} question={q} sub={sub}>
                <article className="award">
                  <Statuette />
                  <p className="award-intro">E o Óscar vai para</p>
                  <a className="award-poster" href={f.url} target="_blank" rel="noreferrer">
                    {f.poster_url && <img src={f.poster_url} alt="" />}
                  </a>
                  <h3>{f.title}</h3>
                  <p className="award-avg">
                    {f === splits[0] ? `${starNum(lo)} a ${starNum(hi)}` : starNum(f.group_avg ?? 0, 2)}
                    <small>
                      {vals.length} notas · desvio {fmt(f.group_std ?? 0, 2)}
                    </small>
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Slide>

      <Slide id="racharam-dados" title="Clima tenso (ou não): os dados">
        <div className="filmtable-scroll reveal">
          <table className="splits">
            <thead>
              <tr>
                <th>Filme</th>
                {r.members.map((mm) => (
                  <th key={mm.username} className="num">
                    {mm.display_name}
                  </th>
                ))}
                <th className="num">Desvio</th>
              </tr>
            </thead>
            <tbody>
              {splits.slice(0, 6).map((f) => {
                const vals = Object.values(f.ratings).filter((v): v is number => v != null);
                const hi = Math.max(...vals);
                const lo = Math.min(...vals);
                return (
                  <tr key={f.slug}>
                    <td>
                      <a href={f.url} target="_blank" rel="noreferrer">
                        {f.title}
                      </a>{" "}
                      <small className="muted">{f.year}</small>
                    </td>
                    {r.members.map((mm) => {
                      const v = f.ratings[mm.username];
                      return (
                        <td key={mm.username} className={`num ${v === hi ? "up" : v === lo ? "down" : ""}`}>
                          {v != null ? stars(v) : <span className="muted">·</span>}
                        </td>
                      );
                    })}
                    <td className="num strong">{fmt(f.group_std ?? 0, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Slide>

      <Slide id="mornos" title="Nem fede nem cheira" lede={`${lukewarm.length} filmes em que todo mundo deu ★★★, ou quase isso.`}>
        <ol className="lukewarm reveal">
          {lukewarm.map((f) => (
            <li key={f.slug}>
              <a href={f.url} target="_blank" rel="noreferrer" title={`${f.title} (${f.year}) · ${fmt(f.group_avg ?? 0, 2)}★ · desvio ${fmt(f.group_std ?? 0, 2)}`}>
                {f.poster_url ? <img src={f.poster_url} alt={f.title} loading="lazy" /> : <span>{f.title}</span>}
              </a>
            </li>
          ))}
        </ol>
      </Slide>

      <Slide id="impopular" title="#OpiniãoImpopular: premiações">
        <div className="reveals reveal">
          {[
            { q: "Óscar amor incompreendido", sub: "gostamos mais que o mundo", f: bySlug[r.divergence.liked_more[0]] },
            { q: "Óscar ranço eterno", sub: "gostamos menos que o mundo", f: bySlug[r.divergence.liked_less[0]] },
          ].map(({ q, sub, f }) => (
            <Reveal key={q} question={q} sub={sub}>
              <article className="award">
                <Statuette />
                <p className="award-intro">E o Óscar vai para</p>
                <a className="award-poster" href={f.url} target="_blank" rel="noreferrer">
                  {f.poster_url && <img src={f.poster_url} alt="" />}
                </a>
                <h3>{f.title}</h3>
                <p className="award-avg">
                  {signed(f.diff_vs_lbxd ?? 0)}
                  <small>
                    {fmt(f.group_avg ?? 0, 2)} nossa · {fmt(f.lbxd_avg, 2)} Letterboxd
                  </small>
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Slide>

      <Slide
        id="impopular-dados"
        title="#OpiniãoImpopular: os dados"
      >
        <div className="two-col dumbbells reveal">
          <div>
            <p className="subhead up">Gostamos mais que o mundo</p>
            <Dumbbell films={r.divergence.liked_more.slice(0, 5).map((s) => bySlug[s])} members={r.members} />
          </div>
          <div>
            <p className="subhead down">Gostamos menos que o mundo</p>
            <Dumbbell films={r.divergence.liked_less.slice(0, 5).map((s) => bySlug[s])} members={r.members} />
          </div>
        </div>
      </Slide>

      <Slide id="intervalo" className="slide-break">
        <p className="break-kicker reveal">Intervalo</p>
        <p className="break-title reveal">Pega a pipoca: agora é com os números.</p>
      </Slide>

      <Slide id="metas" title={`Lembra das metas de ${r.previous.label}?`}>
        <div className="reveal">
          <Goals goals={goals} />
        </div>
      </Slide>

      <Slide id="numeros" title="Os números da sessão">
        <div className="stats-row reveal">
          <Stat value={fmt(m.minutes_watched)} label="minutos assistidos" />
          <Stat value={fmt(m.avg_movie_length, 0)} label="min de duração média" />
          <Stat value={fmt(m.avg_lbxd_rating, 2)} label="nota média no Letterboxd" />
        </div>
        <div className="stats-row reveal">
          <Stat value={m.name_longest_movie} label={`o mais longo · ${m.duration_longest_movie} min`} />
          <Stat value={m.name_shortest_movie} label={`o mais curto · ${m.duration_shortest_movie} min`} />
          <Stat value={m.best_lbxd_rating} label={`melhor nota no site · ${fmt(m.best_lbxd_rating_value, 2)}`} />
          <Stat value={m.worst_lbxd_rating} label={`pior nota no site · ${fmt(m.worst_lbxd_rating_value, 2)}`} />
        </div>
      </Slide>

      <Slide id="decadas" title="De quando são" lede="Filmes por década de lançamento.">
        <div className="reveal">
          <Columns
            items={[...r.decades].sort((a, b) => a.release_decade - b.release_decade).map((d) => ({ label: `${d.release_decade}s`, value: d.movie_count }))}
            previous={r.previous.decades.map((d) => ({ label: `${d.release_decade}s`, value: d.movie_count }))}
            previousLabel={r.previous.label}
          />
        </div>
      </Slide>

      <Slide id="atores" title="Quem mais apareceu na nossa tela" lede="Atores e atrizes com mais filmes na lista.">
        <People people={r.people.actors} />
      </Slide>

      <Slide id="direcao" title="Atrás da câmera" lede="Quem mais dirigiu o que a gente viu.">
        <People people={r.people.directors} />
      </Slide>

      <Slide id="roteiro" title="Quem escreveu" lede="Roteiristas com mais filmes na lista.">
        <People people={r.people.writers} />
      </Slide>

      <Slide id="mundo" title="Países, idiomas e estúdios">
        <div className="three-col reveal">
          <BarList caption="Países" items={r.countries.slice(0, 12).map((c) => ({ label: countryPt(c.country), value: c.movie_count }))} />
          <BarList caption="Idiomas" items={r.languages.slice(0, 12).map((l) => ({ label: languagePt(l.language), value: l.movie_count }))} />
          <BarList caption="Estúdios (3+ filmes)" items={r.studios.slice(0, 12).map((s) => ({ label: s.studio, value: s.movie_count }))} />
        </div>
      </Slide>

      <Slide id="generos" title="Do que a gente gosta">
        <div className="two-col reveal">
          <BarList caption="Gênero principal de cada filme" items={r.genres_primary.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
          <BarList caption="Todos os gêneros marcados" items={r.genres_all.map((g) => ({ label: genrePt(g.genre), value: g.movie_count }))} />
        </div>
      </Slide>

      <Slide id="temas" title="Os temas que mais voltam" lede="Os 20 temas mais frequentes, com os nomes do Letterboxd.">
        <div className="two-col reveal">
          <BarList items={r.themes.slice(0, 10).map((t) => ({ label: t.theme, value: t.movie_count }))} max={r.themes[0].movie_count} />
          <BarList items={r.themes.slice(10, 20).map((t) => ({ label: t.theme, value: t.movie_count }))} max={r.themes[0].movie_count} />
        </div>
      </Slide>

      <Slide id="futuro" title="Sugestões pra próxima temporada">
        <ul className="suggestions reveal">
          <li>
            Só {fewestDecade.movie_count} filme{fewestDecade.movie_count > 1 ? "s" : ""} dos anos {fewestDecade.release_decade}: tá na hora de cavar mais
            fundo no arquivo.
          </li>
          <li>
            {brazil} filmes brasileiros em {m.movies_watched}. Dá pra valorizar mais a indústria nacional.
          </li>
          <li>Nicolas Cage segue no topo com {cage} filmes. Manter a liderança é responsabilidade de todos.</li>
          <li>Mais filmes dirigidos por mulheres.</li>
          <li>Todo mundo logar e dar nota no Letterboxd, senão a média do grupo fica com cara de média de três.</li>
        </ul>
      </Slide>

      <Slide id="filmes" className="slide-table" title="Todos os filmes" lede="Na ordem em que vimos. Clique no cabeçalho para ordenar; os da temporada nova estão marcados.">
        <div className="reveal slide-fill">
          <FilmTable films={r.films} members={r.members} />
        </div>
        <footer className="footer">
          Dados raspados do <a href={r.list_url}>Letterboxd</a> em {date(r.generated_at.slice(0, 10))}. Notas em estrelas (0,5 a 5); fotos via TMDB.
        </footer>
      </Slide>
    </main>
  );
}
