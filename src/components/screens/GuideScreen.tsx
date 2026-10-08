"use client";
/**
 * Astuces : aide-mémoire de cuisine (mesures, four, cuissons, air fryer,
 * remplacements). Le contenu est dans src/config/kitchen-guide.ts.
 * Page statique : disponible hors ligne comme le reste.
 */
import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/app/OfflineBanner";
import { TabBar } from "@/components/app/TabBar";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { SectionTitle, cx } from "@/components/ui/primitives";
import { KITCHEN_GUIDE, type GuideBlock, type OvenSymbol } from "@/config/kitchen-guide";
import { MONTHS, SEASONAL } from "@/config/seasons";

const noSubscribe = () => () => {};

/** Fruits et légumes du mois (le mois en cours d'abord). */
function Seasons({ note }: { note: ReactNode }) {
  // mois en cours lu côté navigateur (la page est générée à l'avance)
  const today = useSyncExternalStore(noSubscribe, () => new Date().getMonth() + 1, () => null);
  const [picked, setPicked] = useState<number | null>(null);
  const month = picked ?? today ?? 1;
  const row = useRef<HTMLDivElement>(null);
  // le mois en cours visible dans la rangée
  useLayoutEffect(() => {
    const chip = row.current?.children[(today ?? 1) - 1] as HTMLElement | undefined;
    if (row.current && chip) row.current.scrollLeft = chip.offsetLeft - row.current.offsetLeft - 20;
  }, [today]);
  const list = (kind: "legume" | "fruit") => SEASONAL.filter((p) => p.kind === kind && p.months.includes(month));
  return (
    <div className="flex flex-col gap-2.5">
      <div ref={row} className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {MONTHS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => setPicked(i + 1)}
            className={cx(
              "h-10 flex-none rounded-full border-[1.5px] px-3.5 text-[15px] font-bold",
              month === i + 1 ? "border-ink bg-ink text-bg" : "border-divider bg-neutral-100",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {(
          [
            ["Légumes", list("legume")],
            ["Fruits", list("fruit")],
          ] as const
        ).map(([title, items]) => (
          <div key={title} className="rounded-3xl bg-surface p-4">
            <h3 className="mb-2 text-[17px] font-bold">{title}</h3>
            <p className="leading-relaxed text-pretty">{items.map((p) => p.name).join(" · ")}</p>
          </div>
        ))}
      </div>
      {note}
    </div>
  );
}

/** Pictogramme de four dessiné à partir de ses éléments. */
function OvenIcon({ draw }: { draw: OvenSymbol["draw"] }) {
  return (
    <svg viewBox="0 0 48 48" className="size-14 flex-none" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden>
      <rect x="3" y="3" width="42" height="42" rx="9" strokeWidth={2} />
      {draw.top && <line x1="12" y1="11" x2="36" y2="11" />}
      {draw.bottom && <line x1="12" y1="37" x2="36" y2="37" />}
      {draw.grill && <polyline points="11,12 15,8 19,12 23,8 27,12 31,8 35,12 37,10" strokeWidth={2.2} />}
      {draw.ring && <circle cx="24" cy="24" r="10" strokeWidth={2} />}
      {draw.fan && (
        <g strokeWidth={2.2}>
          <path d="M24 24c0-4 1.5-6.5 4-6.5S31 21 24 24z" />
          <path d="M24 24c3.5 2 5 4.5 3.7 6.6S22 31 24 24z" />
          <path d="M24 24c-3.5 2-6.2 1.9-7.4-.3S18 17.5 24 24z" />
        </g>
      )}
      {draw.snow && (
        <g strokeWidth={2.2}>
          <line x1="24" y1="13" x2="24" y2="35" />
          <line x1="14.5" y1="18.5" x2="33.5" y2="29.5" />
          <line x1="14.5" y1="29.5" x2="33.5" y2="18.5" />
        </g>
      )}
    </svg>
  );
}

function Block({ block }: { block: GuideBlock }) {
  const title = "title" in block && block.title ? <h3 className="mb-2 text-[17px] font-bold">{block.title}</h3> : null;
  const note = block.note ? <p className="mt-2 text-sm text-neutral-700">{block.note}</p> : null;

  if (block.kind === "table") {
    return (
      <div className="rounded-3xl bg-surface p-4">
        {title}
        <table className="w-full border-collapse text-[16px]">
          <thead>
            <tr>
              {block.head.map((h, i) => (
                <th key={h} className={`pb-1.5 text-xs font-bold tracking-[.06em] text-neutral-700 uppercase ${i ? "pl-4 text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="border-t border-divider">
                {row.map((cell, c) => (
                  <td key={c} className={`py-2 ${c ? "pl-4 text-right font-bold whitespace-nowrap" : "pr-2"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {note}
      </div>
    );
  }

  if (block.kind === "list") {
    return (
      <div className="rounded-3xl bg-surface p-4">
        {title}
        <dl className="flex flex-col">
          {block.items.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 border-t border-divider py-2 first:border-0 sm:flex-row sm:gap-4">
              <dt className="font-bold sm:w-56 sm:flex-none">{k}</dt>
              <dd className="text-pretty">{v}</dd>
            </div>
          ))}
        </dl>
        {note}
      </div>
    );
  }

  if (block.kind === "seasons") return <Seasons note={note} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {block.symbols.map((s) => (
          <div key={s.name} className="flex gap-3.5 rounded-3xl bg-surface p-3.5">
            <span className="text-accent-800">
              <OvenIcon draw={s.draw} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold leading-snug">{s.name}</span>
              <span className="text-[15px] leading-snug text-pretty text-neutral-800">{s.use}</span>
            </div>
          </div>
        ))}
      </div>
      {note}
    </div>
  );
}

export function GuideScreen() {
  return (
    <div className="pb-32">
      <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-5">
          <OfflineBanner className="mb-2" />
          <h1 className="pt-3 font-heading text-[36px] leading-[1.1]">Astuces</h1>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-3xl gap-2 overflow-x-auto px-5 py-3">
          {KITCHEN_GUIDE.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex h-10 flex-none items-center rounded-full border-[1.5px] border-divider bg-neutral-100 px-4 text-[15px] font-bold"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pt-2">
        {KITCHEN_GUIDE.map((section) => (
          <section key={section.id} id={section.id} className="flex scroll-mt-40 flex-col gap-3">
            <SectionTitle>{section.title}</SectionTitle>
            {section.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
          </section>
        ))}
      </main>
      <TabBar />
    </div>
  );
}
