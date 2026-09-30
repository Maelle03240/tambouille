"use client";
import { IconWifiOff } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { useApp } from "./AppProvider";

/** Bandeau « hors ligne » (maquette : pilule sombre en haut). */
export function OfflineBanner({ className, compact }: { className?: string; compact?: boolean }) {
  const { online } = useApp();
  if (online) return null;
  return (
    <div
      role="status"
      className={cx(
        "flex items-center gap-2.5 rounded-full bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100",
        className,
      )}
    >
      <IconWifiOff size={18} />
      <span>{compact ? "Hors ligne" : "Hors ligne — les recettes restent disponibles"}</span>
    </div>
  );
}
