"use client";
/**
 * RÉGLAGES → PROPOSITIONS (admin) : la liste des propositions des membres ;
 * on en ouvre une (?id=) pour la voir en entier, puis Accepter / Refuser.
 * - ?id=<recette proposée> : nouvelle recette, affichée en entier ;
 * - ?id=<recette de la bibliothèque> : ses versions perso, avant / après.
 * Ce qui est accepté repart avec le sticker NEW (à vérifier en cuisinant).
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/app/AppProvider";
import { CreationDetail, ForkProposal } from "@/components/admin/Proposals";
import { IconChevronRight } from "@/components/ui/icons";
import { BackLink, EmptyState, Spinner } from "@/components/ui/primitives";
import { categoryColors } from "@/config/categories";
import { useAllRecipes, usePendingProposals, usePeople } from "@/lib/data/hooks";
import type { Recipe } from "@/lib/recipes/types";

export function ProposalsScreen() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { isAdmin } = useApp();
  const pending = usePendingProposals();
  const all = useAllRecipes();
  const people = usePeople();
  const nameOf = (uid: string | null) => people?.find((p) => p.id === uid)?.displayName || "?";

  const byId = useMemo(() => new Map((all ?? []).map((r) => [r.id, r])), [all]);
  const isFork = (r: Recipe) => !!r.forkedFromId && byId.has(r.forkedFromId);

  // une ligne par nouvelle recette, une par recette de la bibliothèque modifiée
  const entries = useMemo(() => {
    const out: { id: string; recipe: Recipe; label: string }[] = [];
    for (const r of pending ?? []) {
      if (!isFork(r)) out.push({ id: r.id, recipe: r, label: `Nouvelle recette de ${nameOf(r.ownerId)}` });
    }
    const groups = new Map<string, Recipe[]>();
    for (const r of pending ?? []) if (isFork(r)) groups.set(r.forkedFromId!, [...(groups.get(r.forkedFromId!) ?? []), r]);
    for (const [orig, forks] of groups) {
      out.push({ id: orig, recipe: byId.get(orig)!, label: `Modifiée par ${forks.map((f) => nameOf(f.ownerId)).join(", ")}` });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, byId, people]);

  const back = () => router.replace("/propositions");

  if (!isAdmin) {
    return (
      <main className="pt-safe mx-auto max-w-2xl px-4">
        <BackLink href="/reglages" />
        <p className="py-10 text-center text-neutral-700">Réservé à l&apos;admin.</p>
      </main>
    );
  }

  const selected = id ? byId.get(id) : undefined;
  const forks = selected ? (pending ?? []).filter((r) => r.forkedFromId === selected.id) : [];

  return (
    <div className="pb-16">
      <header className="pt-safe mx-auto flex max-w-2xl items-center gap-3 px-4 pb-2">
        <BackLink href={id ? "/propositions" : "/reglages"} />
        <h1 className="min-w-0 font-heading text-[30px] leading-tight">{selected ? selected.title : "Propositions"}</h1>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4">
        {pending === undefined ? (
          <Spinner />
        ) : !id ? (
          entries.length === 0 ? (
            <EmptyState title="Aucune proposition" />
          ) : (
            entries.map((e) => {
              const colors = categoryColors(e.recipe.category);
              return (
                <Link
                  key={e.id}
                  href={`/propositions?id=${e.id}`}
                  className="flex items-center gap-3 rounded-[26px] px-4 py-3.5"
                  style={{ background: colors.bg, color: colors.ink }}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-heading text-[20px] leading-tight">{e.recipe.title}</span>
                    <span className="text-sm opacity-80">{e.label}</span>
                  </span>
                  <IconChevronRight size={20} />
                </Link>
              );
            })
          )
        ) : !selected ? (
          <EmptyState title="Proposition traitée" />
        ) : forks.length ? (
          forks.map((f) => <ForkProposal key={f.id} fork={f} original={selected} author={nameOf(f.ownerId)} onDone={back} />)
        ) : selected.status === "personal" && selected.proposalStatus === "pending" ? (
          <>
            <p className="text-neutral-700">Nouvelle recette de {nameOf(selected.ownerId)}</p>
            <CreationDetail recipe={selected} onDone={back} />
          </>
        ) : (
          <EmptyState title="Proposition traitée" />
        )}
      </main>
    </div>
  );
}
