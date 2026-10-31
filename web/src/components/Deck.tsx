"use client";

import { useEffect, useRef, useState } from "react";

const DURATION = 850;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Algum ancestral rolável (ex.: tabela) ainda consegue rolar nessa direção? */
function scrollableInside(target: EventTarget | null, dir: 1 | -1): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      if (dir > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      if (dir < 0 && el.scrollTop > 0) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Transforma as seções `.slide` em uma apresentação: rolar o mouse, setas, PgUp/PgDn,
 * espaço ou deslizar o dedo leva ao slide seguinte com uma rolagem animada. O slide
 * visível ganha `.is-active`, que dispara a animação de entrada do conteúdo.
 * Em telas pequenas/baixas a rolagem continua livre (o CSS também desliga o modo deck).
 */
export function Deck({ labels }: { labels: string[] }) {
  const [active, setActive] = useState(0);
  const [deckMode, setDeckMode] = useState(false);
  const animating = useRef(false);
  const current = useRef(0);

  useEffect(() => {
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    const media = window.matchMedia("(min-width: 900px) and (min-height: 600px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const setCurrent = (i: number) => {
      current.current = i;
      setActive(i);
      slides.forEach((s, j) => s.classList.toggle("is-active", j === i));
    };

    // Slide ativo = o que ocupa o centro da tela (vale também para rolagem livre).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = slides.indexOf(e.target as HTMLElement);
            e.target.classList.add("was-seen");
            if (!animating.current) setCurrent(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    slides.forEach((s) => observer.observe(s));

    const goTo = (i: number) => {
      const target = Math.max(0, Math.min(slides.length - 1, i));
      if (target === current.current && Math.abs(window.scrollY - slides[target].offsetTop) < 2) return;
      setCurrent(target);
      slides[target].classList.add("was-seen");
      const from = window.scrollY;
      const to = slides[target].offsetTop;
      if (reduce.matches) {
        window.scrollTo(0, to);
        return;
      }
      animating.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        window.scrollTo(0, from + (to - from) * easeInOutCubic(t));
        if (t < 1) requestAnimationFrame(step);
        else setTimeout(() => (animating.current = false), 120);
      };
      requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (!media.matches || e.ctrlKey) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (Math.abs(e.deltaY) < 4 || scrollableInside(e.target, dir)) return;
      e.preventDefault();
      if (!animating.current) goTo(current.current + dir);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!media.matches) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const next = ["ArrowDown", "PageDown", " "].includes(e.key) && !e.shiftKey;
      const prev = ["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey);
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        goTo(e.key === "Home" ? 0 : slides.length - 1);
      } else if (next || prev) {
        if (scrollableInside(e.target, next ? 1 : -1)) return;
        e.preventDefault();
        if (!animating.current) goTo(current.current + (next ? 1 : -1));
      }
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!media.matches || touchY == null) return;
      const dy = touchY - e.touches[0].clientY;
      if (scrollableInside(e.target, dy > 0 ? 1 : -1)) return;
      e.preventDefault();
      if (Math.abs(dy) > 40 && !animating.current) {
        goTo(current.current + (dy > 0 ? 1 : -1));
        touchY = null;
      }
    };

    // Links internos (#ancora) também animam.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href^='#']");
      if (!a || !media.matches) return;
      const i = slides.findIndex((s) => s.id === a.getAttribute("href")!.slice(1));
      if (i >= 0) {
        e.preventDefault();
        goTo(i);
      }
    };

    // Ao redimensionar, realinha no slide atual.
    const onResize = () => {
      if (media.matches) window.scrollTo(0, slides[current.current].offsetTop);
    };
    const onMedia = () => {
      setDeckMode(media.matches);
      document.documentElement.classList.toggle("deck", media.matches);
    };
    onMedia();
    media.addEventListener("change", onMedia);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("resize", onResize);
    document.addEventListener("click", onClick);
    (window as unknown as { deckGoTo: (i: number) => void }).deckGoTo = goTo;

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMedia);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const go = (i: number) => (window as unknown as { deckGoTo?: (i: number) => void }).deckGoTo?.(i);

  return (
    <>
      <nav className="deck-dots" aria-label="Slides" hidden={!deckMode}>
        {labels.map((label, i) => (
          <button key={label + i} type="button" className={i === active ? "is-current" : ""} onClick={() => go(i)} aria-label={label} aria-current={i === active}>
            <span className="deck-dot-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="deck-counter" aria-hidden hidden={!deckMode}>
        {String(active + 1).padStart(2, "0")} <i>/</i> {String(labels.length).padStart(2, "0")}
      </div>
      {deckMode && active < labels.length - 1 && (
        <button type="button" className="deck-next" onClick={() => go(active + 1)} aria-label="Próximo slide">
          ↓
        </button>
      )}
    </>
  );
}
