"use client";
import { useSearchParams } from "next/navigation";

/**
 * Les pages recette utilisent `?id=` (et non /recette/[id]) : ce sont des
 * pages statiques, donc disponibles hors ligne via le service worker, quelle
 * que soit la recette ouverte.
 */
export function useSearchId(): string | null {
  return useSearchParams().get("id");
}
