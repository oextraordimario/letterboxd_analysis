"use client";

import { useState } from "react";

/** Cartão com uma pergunta na frente; clicar vira o cartão e mostra a resposta (children). */
export function Reveal({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flip${open ? " is-open" : ""}`}>
      <button type="button" className="flip-front" onClick={() => setOpen(true)} aria-expanded={open} tabIndex={open ? -1 : 0}>
        <span className="flip-question">{question}</span>
        <span className="flip-hint">clique para revelar</span>
      </button>
      <div className="flip-back" aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}
