"use client";
import type { ReactNode } from "react";
import { IconAlert } from "@/components/ui/icons";
import type { Doubt } from "@/lib/recipes/import-format";

/**
 * Encadré « point à vérifier » (maquette écran 05) autour d'un champ :
 * question de l'IA, propositions, et « C'est bon ».
 */
export function DoubtBox({
  doubt,
  onPick,
  onResolve,
  children,
}: {
  doubt: Doubt | undefined;
  onPick?: (option: string) => void;
  onResolve: () => void;
  children: ReactNode;
}) {
  if (!doubt) return <>{children}</>;
  return (
    <div className="my-1.5 flex flex-col gap-2 rounded-field border-[1.5px] border-accent-300 bg-accent-100 px-3.5 py-3">
      <div className="flex items-center gap-2 text-sm font-bold text-accent-800">
        <IconAlert size={16} />
        <span className="flex-1">{doubt.question}</span>
      </div>
      {children}
      <div className="flex flex-wrap gap-2">
        {doubt.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick?.(o)}
            className="h-11 rounded-full border-[1.5px] border-divider bg-neutral-100 px-4 font-bold"
          >
            {o}
          </button>
        ))}
        <button type="button" onClick={onResolve} className="h-11 rounded-full bg-ink px-4 font-bold text-bg">
          C&apos;est bon
        </button>
      </div>
    </div>
  );
}
