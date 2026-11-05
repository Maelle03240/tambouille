"use client";
/** Compte retiré de tous ses foyers : ni menu ni courses, on le dit au lieu d'échouer. */
import { useApp } from "@/components/app/AppProvider";
import { useHouseholds } from "@/lib/data/hooks";

export function useNoHousehold() {
  const { mode } = useApp();
  const households = useHouseholds();
  return mode === "supabase" && !!households && !households.currentId;
}

export function NoHouseholdNotice() {
  return <p className="rounded-field bg-accent-100 px-4 py-3 text-accent-800">Aucun foyer : demande à l&apos;admin de t&apos;en ajouter un.</p>;
}
