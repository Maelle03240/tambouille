"use client";
import { useState } from "react";
import { useApp } from "@/components/app/AppProvider";
import { Button, Chip, Sheet, TextArea } from "@/components/ui/primitives";
import { addManualReview } from "@/lib/data/actions";

const SUGGESTIONS = ["Quantités à revoir", "Temps à revoir", "Étape pas claire", "Ingrédient manquant", "Kcal à vérifier"];

/** Ajoute une note « à revoir » — fonctionne hors ligne (envoyée au retour du réseau). */
export function ReviewNoteSheet({
  recipeId,
  open,
  onClose,
  onAdded,
}: {
  recipeId: string;
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { toast, online } = useApp();
  const [note, setNote] = useState("");

  async function submit(text: string) {
    if (!text.trim()) return;
    await addManualReview(recipeId, text);
    setNote("");
    onClose();
    onAdded?.();
    toast(online ? "Ajouté à la liste « à revoir »" : "Noté — sera envoyé au retour du réseau");
  }

  return (
    <Sheet open={open} onClose={onClose} title="À revoir">
      <p className="-mt-1 text-[15px] text-neutral-700">Une note rapide, tu corrigeras plus tard.</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Chip key={s} onClick={() => submit(s)}>
            {s}
          </Chip>
        ))}
      </div>
      <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ou écris ta note…" rows={3} />
      <Button variant="primary" size="lg" onClick={() => submit(note)} disabled={!note.trim()} className="mb-2">
        Ajouter
      </Button>
    </Sheet>
  );
}
