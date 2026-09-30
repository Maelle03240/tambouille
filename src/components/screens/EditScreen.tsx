"use client";
/** Modification d'une recette existante (?id=…&champ=… pour aller à un champ). */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/app/AppProvider";
import { RecipeEditor } from "@/components/editor/RecipeEditor";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { useRecipe } from "@/lib/data/hooks";

export function EditScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const recipe = useRecipe(id);
  const { canEdit, online } = useApp();

  if (recipe === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-600">
        <Spinner />
      </div>
    );
  }
  if (!recipe || !canEdit || !online) {
    return (
      <div className="pt-safe px-5">
        <EmptyState title={!recipe ? "Recette introuvable" : !online ? "Hors ligne" : "Lecture seule"}>
          {!online && <p>La modification revient avec la connexion.</p>}
          <Link href={recipe ? `/recette?id=${recipe.id}` : "/"} className="font-bold text-accent-700">
            Retour
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <RecipeEditor
      key={recipe.id}
      initial={recipe}
      mode="edit"
      focusField={params.get("champ")}
      onSaved={(r) => router.replace(`/recette?id=${r.id}`)}
      onDeleted={() => router.replace("/")}
      headerLeft={
        <button type="button" onClick={() => router.back()} className="h-11 px-3 font-bold text-accent-700">
          Annuler
        </button>
      }
    />
  );
}
