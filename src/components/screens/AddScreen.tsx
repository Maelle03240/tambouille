"use client";
/**
 * Ajout d'une recette : lecture IA (photo, capture, texte, lien), JSON collé
 * ou saisie manuelle → écran de vérification → enregistrement.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { RecipeEditor } from "@/components/editor/RecipeEditor";
import { AddSheet } from "@/components/recipe/AddSheet";
import { Button, Spinner, TextArea } from "@/components/ui/primitives";
import { extractUrl, requestParse } from "@/lib/import/client";
import { claudeImportPrompt } from "@/lib/import/claude-prompt";
import { imageToBase64 } from "@/lib/import/image";
import { clearPendingImport, peekPendingImport, type PendingImport } from "@/lib/import/pending";
import { emptyRecipe } from "@/lib/recipes/factory";
import { importToRecipe, parseImportJson, type Doubt, type ImportData } from "@/lib/recipes/import-format";
import type { Recipe, SourceType } from "@/lib/recipes/types";

type Phase =
  | { kind: "choose" }
  | { kind: "input"; mode: "texte" | "json" }
  | { kind: "loading"; label: string; preview?: string }
  | { kind: "error"; message: string }
  | { kind: "review"; recipe: Recipe; doubts: Doubt[]; sourceLabel: string; mode: "review" | "create" };

const SOURCE_LABELS: Record<string, string> = {
  photo: "Lu depuis ta photo",
  capture: "Lu depuis ta capture",
  texte: "Lu depuis le texte collé",
  lien: "Lu depuis la page web",
  json: "Importé depuis le JSON",
};

function initialPhase(mode: string | null, pending: PendingImport | null): Phase {
  if (mode === "image" && pending) {
    return { kind: "loading", label: "Lecture de la recette…", preview: URL.createObjectURL(pending.file) };
  }
  if (mode === "texte" || mode === "json") return { kind: "input", mode };
  if (mode === "manuel") return { kind: "review", recipe: emptyRecipe(), doubts: [], sourceLabel: "", mode: "create" };
  return { kind: "choose" };
}

export function AddScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useApp();
  const mode = params.get("mode");
  const [pending] = useState(() => (mode === "image" ? peekPendingImport() : null));
  const [phase, setPhase] = useState<Phase>(() => initialPhase(mode, pending));
  const [text, setText] = useState("");
  const started = useRef(false);

  function toReview(data: ImportData, source: SourceType) {
    const { recipe, doubts } = importToRecipe(data, source);
    setPhase({ kind: "review", recipe, doubts, sourceLabel: SOURCE_LABELS[source] ?? "", mode: "review" });
  }

  // Lecture de la photo choisie dans la feuille « Ajouter » (une seule fois)
  useEffect(() => {
    if (!pending || started.current) return;
    started.current = true;
    clearPendingImport();
    imageToBase64(pending.file)
      .then((img) => requestParse({ kind: "image", ...img }))
      .then((data) => toReview(data, pending.source))
      .catch((e) => setPhase({ kind: "error", message: e instanceof Error ? e.message : "La lecture a échoué." }));
  }, [pending]);

  async function readText() {
    const url = extractUrl(text);
    setPhase({ kind: "loading", label: url ? "Lecture de la page…" : "Lecture du texte…" });
    try {
      const data = await requestParse(url ? { kind: "url", url } : { kind: "text", text });
      toReview(data, url ? "lien" : "texte");
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "La lecture a échoué." });
    }
  }

  function readJson() {
    const res = parseImportJson(text);
    if (!res.ok) return toast(res.error);
    toReview(res.data, "json");
  }

  const cancel = (
    <button type="button" onClick={() => router.push("/")} className="h-11 px-3 font-bold text-accent-700">
      Annuler
    </button>
  );

  if (phase.kind === "review") {
    return (
      <RecipeEditor
        initial={phase.recipe}
        mode={phase.mode}
        doubts={phase.doubts}
        sourceLabel={phase.sourceLabel}
        onSaved={(r) => router.replace(`/recette?id=${r.id}`)}
        headerLeft={cancel}
      />
    );
  }

  if (phase.kind === "choose") {
    return <AddSheet open onClose={() => router.push("/")} />;
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-5 pb-10">
      <div className="-mx-2 flex items-center justify-between">
        {cancel}
        <div className="text-base font-bold">Ajouter une recette</div>
        <div className="w-20" />
      </div>

      {phase.kind === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          {phase.preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={phase.preview} alt="" className="max-h-[45dvh] rounded-3xl object-contain opacity-80 shadow-md" />
          )}
          <Spinner className="size-8 text-accent-600" />
          <p className="font-heading text-2xl">{phase.label}</p>
          <p className="text-neutral-700">Quelques secondes : l&apos;IA met la recette en forme.</p>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="flex flex-col gap-4 pt-10">
          <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">{phase.message}</p>
          <Button variant="primary" onClick={() => setPhase({ kind: "choose" })}>
            Réessayer
          </Button>
          <Button onClick={() => setPhase({ kind: "review", recipe: emptyRecipe(), doubts: [], sourceLabel: "", mode: "create" })}>
            Saisir à la main
          </Button>
        </div>
      )}

      {phase.kind === "input" && phase.mode === "texte" && (
        <>
          <h1 className="font-heading text-[28px] leading-tight">Coller du texte ou un lien</h1>
          <p className="text-neutral-700">Le texte d&apos;une recette (message, notes…) ou le lien d&apos;une page web.</p>
          <TextArea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Colle ici…" />
          <Button variant="primary" size="lg" onClick={readText} disabled={!text.trim()}>
            Lire la recette
          </Button>
        </>
      )}

      {phase.kind === "input" && phase.mode === "json" && (
        <>
          <h1 className="font-heading text-[28px] leading-tight">Coller du JSON</h1>
          <p className="text-neutral-700">
            Pour une recette déjà mise en forme ailleurs (par exemple dans une conversation avec Claude). Copie les consignes,
            colle-les dans la conversation avec ta recette, puis colle ici la réponse.
          </p>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(claudeImportPrompt());
                toast("Consignes copiées");
              } catch {
                toast("Copie impossible sur cet appareil");
              }
            }}
          >
            Copier les consignes pour Claude
          </Button>
          <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder='{ "title": "…", … }' className="font-mono text-sm" />
          <Button variant="primary" size="lg" onClick={readJson} disabled={!text.trim()}>
            Importer
          </Button>
        </>
      )}
    </div>
  );
}
