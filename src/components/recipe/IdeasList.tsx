"use client";
/**
 * Idées de recettes à ajouter plus tard (« lasagnes de mamie ») : juste un
 * nom, à moi seule. Toucher une idée ouvre une fiche vide avec ce titre ;
 * une fois la recette enregistrée, l'idée disparaît.
 */
import { useState, type ReactNode } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconChevronRight, IconClose, IconPlus } from "@/components/ui/icons";
import { TextInput } from "@/components/ui/primitives";
import { addIdea, deleteIdea } from "@/lib/data/actions";
import { useIdeas } from "@/lib/data/hooks";
import type { RecipeIdea } from "@/lib/recipes/types";

export function IdeasList({ header, onWrite }: { header: ReactNode; onWrite: (idea: RecipeIdea) => void }) {
  const ideas = useIdeas();
  const { online, toast } = useApp();
  const [text, setText] = useState("");

  const run = (p: Promise<unknown>) => p.catch((e) => toast(e instanceof Error ? e.message : "Impossible"));

  function add() {
    if (!text.trim()) return;
    void run(addIdea(text));
    setText("");
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-2xl flex-col gap-3 px-5 pb-10">
      <div className="-mx-2 flex items-center">{header}</div>
      <h1 className="font-heading text-[28px] leading-tight">Idées à ajouter</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ex. Lasagnes de mamie"
          enterKeyHint="done"
          className="flex-1"
        />
        <button
          type="submit"
          aria-label="Ajouter"
          disabled={!online || !text.trim()}
          className="flex size-12 flex-none items-center justify-center rounded-full bg-accent-600 text-neutral-100 disabled:opacity-45"
        >
          <IconPlus />
        </button>
      </form>
      {ideas?.map((idea) => (
        <div key={idea.id} className="flex items-center gap-1 rounded-[22px] bg-surface pr-1.5">
          <button type="button" onClick={() => onWrite(idea)} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 px-4 text-left">
            <span className="min-w-0 flex-1 font-bold">{idea.text}</span>
            <span className="flex items-center text-sm font-bold whitespace-nowrap text-accent-700">
              Écrire <IconChevronRight size={16} />
            </span>
          </button>
          <button
            type="button"
            aria-label="Retirer"
            disabled={!online}
            onClick={() => void run(deleteIdea(idea.id))}
            className="flex size-10 flex-none items-center justify-center rounded-full text-neutral-700 disabled:opacity-45"
          >
            <IconClose size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
