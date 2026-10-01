"use client";
/**
 * PROPOSITIONS (famille étape 2) — blocs de l'écran Réglages → Propositions.
 * - Recette créée par un membre : Accepter (→ bibliothèque) ou Refuser.
 * - Versions perso d'une même recette : regroupées ; pour chacune, les blocs
 *   changés côte à côte (actuel → proposé), cochés par défaut sauf ceux que
 *   l'admin a aussi modifiés entre-temps (sa version d'abord).
 * Logique : src/lib/recipes/proposals.ts (testée).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconCheck } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { CATEGORIES } from "@/config/categories";
import { MOMENTS } from "@/config/moments";
import { tagLabel } from "@/config/tags";
import { acceptCreation, acceptFork, refuseProposal } from "@/lib/data/actions";
import { BLOCKS, blockLines, defaultTake, reviewProposal, type BlockKey } from "@/lib/recipes/proposals";
import type { Recipe } from "@/lib/recipes/types";
import { imageUrl } from "@/lib/images";

/** Libellé d'une catégorie, d'un moment ou d'un tag (pour l'avant / après). */
export const labelOf = (id: string) =>
  !id ? "—" : (CATEGORIES.find((c) => c.id === id)?.label ?? MOMENTS.find((m) => m.id === id)?.label ?? tagLabel(id));

/** Une nouvelle recette proposée, en entier, pour juger avant d'accepter. */
export function CreationDetail({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const img = imageUrl(recipe.imagePath);
  return (
    <div className="flex flex-col gap-3">
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="h-52 w-full rounded-3xl object-cover" />
      )}
      {BLOCKS.filter((b) => b.key !== "title" && b.key !== "image").map((b) => {
        const lines = blockLines(recipe, b.key, labelOf);
        if (b.key === "notes" && lines[0] === "—") return null;
        return (
          <div key={b.key} className="flex flex-col gap-1 rounded-[20px] bg-surface px-4 py-3">
            <span className="text-[13px] font-bold tracking-[.04em] text-accent-700 uppercase">{b.label}</span>
            {lines.map((l, i) => (
              <span key={i} className="leading-snug">
                {l}
              </span>
            ))}
          </div>
        );
      })}
      <Decision onAccept={() => acceptCreation(recipe.id).then(onDone)} onRefuse={() => refuseProposal(recipe.id).then(onDone)} />
    </div>
  );
}

export function ForkProposal({ fork, original, author, onDone }: { fork: Recipe; original: Recipe; author: string; onDone?: () => void }) {
  const review = useMemo(() => reviewProposal(fork, original), [fork, original]);
  // undefined = choix par défaut (recalculé si l'originale change)
  const [picked, setPicked] = useState<BlockKey[] | undefined>(undefined);
  const take = picked ?? defaultTake(review);
  const toggle = (k: BlockKey) => setPicked(take.includes(k) ? take.filter((x) => x !== k) : [...take, k]);

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-neutral-100 p-3.5">
      <p className="font-bold">
        Version de {author}{" "}
        <Link href={`/recette?id=${fork.id}`} className="text-sm text-accent-700">
          voir
        </Link>
      </p>
      {review.changed.length === 0 && <p className="text-sm text-neutral-700">Aucun changement.</p>}
      {review.changed.map((k) => {
        const on = take.includes(k);
        const conflict = review.conflicts.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            aria-pressed={on}
            className={cx("flex flex-col gap-1.5 rounded-2xl border-[1.5px] p-3 text-left", on ? "border-leaf-600 bg-leaf-100" : "border-divider")}
          >
            <span className="flex items-center gap-2 font-bold">
              <span className={cx("flex size-6 flex-none items-center justify-center rounded-full border-2", on ? "border-leaf-600 bg-leaf-600 text-neutral-100" : "border-neutral-500")}>
                {on && <IconCheck size={14} stroke={3.5} />}
              </span>
              {BLOCKS.find((b) => b.key === k)!.label}
            </span>
            {conflict && <span className="text-[13px] font-bold text-accent-800">Tu l&apos;as aussi modifié depuis : ta version est gardée si tu ne coches pas.</span>}
            <span className="grid gap-2 text-[13px] leading-snug sm:grid-cols-2">
              <span className="flex flex-col text-neutral-700 line-through decoration-neutral-400">
                {blockLines(original, k, labelOf).map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </span>
              <span className="flex flex-col font-semibold">
                {blockLines(review.theirs, k, labelOf).map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </span>
            </span>
          </button>
        );
      })}
      <Decision
        acceptLabel={review.changed.length ? `Accepter (${take.length})` : undefined}
        onAccept={review.changed.length && take.length ? () => acceptFork(fork.id, take).then(onDone) : undefined}
        onRefuse={() => refuseProposal(fork.id).then(onDone)}
      />
    </div>
  );
}

export function Decision({ onAccept, onRefuse, acceptLabel = "Accepter" }: { onAccept?: () => Promise<unknown>; onRefuse: () => Promise<unknown>; acceptLabel?: string }) {
  const { toast, online } = useApp();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex gap-2">
      {onAccept && (
        <button
          type="button"
          disabled={busy || !online}
          onClick={() => run(onAccept, "Acceptée")}
          className="h-11 flex-1 rounded-full bg-leaf-700 font-bold text-neutral-100 disabled:opacity-45"
        >
          {acceptLabel}
        </button>
      )}
      <button
        type="button"
        disabled={busy || !online}
        onClick={() => run(onRefuse, "Refusée")}
        className="h-11 flex-1 rounded-full border-[1.5px] border-divider font-bold disabled:opacity-45"
      >
        Refuser
      </button>
    </div>
  );
}
