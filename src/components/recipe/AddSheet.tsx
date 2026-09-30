"use client";
/**
 * Feuille « Ajouter une recette » (maquette écran 04) : photo, capture,
 * texte/lien, plus saisie à la main et secours « coller du JSON ».
 */
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { useApp } from "@/components/app/AppProvider";
import { IconBraces, IconCamera, IconImage, IconText } from "@/components/ui/icons";
import { Button, Sheet } from "@/components/ui/primitives";
import { setPendingImport } from "@/lib/import/pending";

function Option({
  icon,
  iconClass,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[84px] items-center gap-4 rounded-[28px] bg-surface px-[18px] py-3.5 text-left active:bg-neutral-300 disabled:opacity-45"
    >
      <span className={`flex size-[52px] flex-none items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-lg font-bold">{title}</span>
        <span className="text-sm text-neutral-700">{subtitle}</span>
      </span>
    </button>
  );
}

export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { features, online } = useApp();
  const photoInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const aiOff = !features.ai;

  const onFile = (source: "photo" | "capture") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingImport({ kind: "image", file, source });
    onClose();
    router.push("/ajouter?mode=image");
  };

  const go = (mode: string) => {
    onClose();
    router.push(`/ajouter?mode=${mode}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter une recette">
      {!online ? (
        <p className="rounded-field bg-neutral-200 px-4 py-3">
          Pas de réseau : l&apos;ajout de recettes revient dès que la connexion est de retour.
        </p>
      ) : (
        <>
          <p className="-mt-2 mb-1 text-[15px] text-neutral-700">
            {aiOff
              ? "La lecture automatique n'est pas configurée : saisis à la main ou colle du JSON."
              : "L'IA la met en forme, tu vérifies avant d'enregistrer."}
          </p>
          <Option
            icon={<IconCamera />}
            iconClass="bg-accent-300 text-accent-900"
            title="Prendre en photo"
            subtitle="Une page de livre, une fiche manuscrite"
            onClick={() => photoInput.current?.click()}
            disabled={aiOff}
          />
          <Option
            icon={<IconImage />}
            iconClass="bg-leaf-300 text-leaf-900"
            title="Importer une capture"
            subtitle="Depuis tes photos : réseau social, site…"
            onClick={() => captureInput.current?.click()}
            disabled={aiOff}
          />
          <Option
            icon={<IconText />}
            iconClass="bg-[oklch(0.87_0.07_95)] text-[oklch(0.3_0.07_95)]"
            title="Coller du texte ou un lien"
            subtitle="Un message, une page web, tes notes"
            onClick={() => go("texte")}
            disabled={aiOff}
          />
          <div className="mt-1 mb-2 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => go("manuel")}>
              Écrire à la main
            </Button>
            <Button variant="ghost" onClick={() => go("json")}>
              <IconBraces size={18} /> Coller du JSON
            </Button>
          </div>
          <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile("photo")} />
          <input ref={captureInput} type="file" accept="image/*" hidden onChange={onFile("capture")} />
        </>
      )}
    </Sheet>
  );
}
