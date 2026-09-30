/**
 * Point d'entrée des données : choisit Supabase ou le mode local selon les
 * variables d'environnement publiques.
 */
import { LocalRepository } from "./local-repository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabase-repository";

let instance: Repository | null = null;

export function getRepository(): Repository {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? new SupabaseRepository(url, key) : new LocalRepository();
  return instance;
}

export const isLocalMode = () => getRepository().mode === "local";
