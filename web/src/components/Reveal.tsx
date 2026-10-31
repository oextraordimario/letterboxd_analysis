"use client";

import { useState } from "react";

/** Envelope com uma pergunta na frente; clicar vira o cartão e mostra a resposta (children). */
export function Reveal({ question, sub, variant, children }: { question: string; sub?: string; variant?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flip${variant ? ` flip-${variant}` : ""}${open ? " is-open" : ""}`}>
      <button type="button" className="flip-front" onClick={() => setOpen(true)} aria-expanded={open} tabIndex={open ? -1 : 0}>
        <span className="envelope-flap" aria-hidden />
        <span className="envelope-seal" aria-hidden>
          <svg viewBox="0 0 24 64"><circle cx="12" cy="5.5" r="3.6" /><path d="M7.6 11.2Q12 8.6 16.4 11.2L15.4 22Q14.6 33 15 44H9Q9.4 33 8.6 22Z" /><path d="M7 44h10v3H7zM5 47.5h14v3H5zM6 51h12v10H6z" /></svg>
        </span>
        <span className="flip-question">
          {question}
          {sub && <small>{sub}</small>}
        </span>
      </button>
      <div className="flip-back" aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}
