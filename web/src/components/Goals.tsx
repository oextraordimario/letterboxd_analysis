"use client";

import { useState } from "react";

export type Goal = { text: string; status: "done" | "miss" | "unknown"; evidence: string };

const MARK = { done: "✓", miss: "✗", unknown: "?" } as const;
const VERDICT = { done: "cumprida", miss: "falhou", unknown: "inconclusivo" } as const;

/** Lista de metas com o resultado escondido; clicar em cada uma revela se foi cumprida. */
export function Goals({ goals }: { goals: Goal[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const reveal = (i: number) => setOpen((s) => new Set(s).add(i));

  return (
    <ol className="goals">
      {goals.map((g, i) => {
        const shown = open.has(i);
        return (
          <li key={g.text} className={`goal ${shown ? `is-open goal-${g.status}` : "goal-hidden"}`}>
            <button type="button" className="goal-row" onClick={() => reveal(i)} disabled={shown} aria-expanded={shown}>
              <span className="goal-mark" aria-hidden>
                {shown ? MARK[g.status] : "•"}
              </span>
              <span className="goal-text">{g.text}</span>
              <span className="goal-evidence">
                {shown ? (
                  <>
                    <b>{VERDICT[g.status]}</b> · {g.evidence}
                  </>
                ) : (
                  "e aí?"
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
