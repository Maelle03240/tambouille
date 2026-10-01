"use client";
/**
 * État global de l'appli : connexion, réseau, synchro, rôle, fonctions IA
 * disponibles, et petits messages (toasts).
 */
import { useLiveQuery } from "dexie-react-hooks";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getRepository } from "@/lib/data";
import { clearLocalData } from "@/lib/data/actions";
import { getMeta, requestPersistentStorage, setMeta } from "@/lib/data/db";
import type { Session } from "@/lib/data/repository";
import { getSyncStatus, subscribeSync, syncNow } from "@/lib/data/sync";
import type { Profile } from "@/lib/recipes/types";
import { LoginScreen } from "./LoginScreen";

interface AppState {
  mode: "supabase" | "local";
  session: Session | null;
  profile: Profile | null;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  features: { ai: boolean; illustrations: boolean; invites?: boolean };
  canEdit: boolean;
  isAdmin: boolean;
  sync: () => Promise<void>;
  signOut: () => Promise<void>;
  toast: (message: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp hors de AppProvider");
  return v;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const useOnline = () =>
  useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

const SERVER_SYNC_STATUS = { syncing: false, error: null };
const NO_FEATURES = { ai: false, illustrations: false };

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = getRepository();
  const online = useOnline();
  const syncStatus = useSyncExternalStore(subscribeSync, getSyncStatus, () => SERVER_SYNC_STATUS);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cachedProfile = useLiveQuery(() => getMeta("profile"), []);
  const cachedFeatures = useLiveQuery(() => getMeta("features"), []);
  const features = cachedFeatures ?? NO_FEATURES;

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Session
  useEffect(() => {
    requestPersistentStorage();
    // hors ligne, Supabase peut mettre longtemps (ou échouer) à rafraîchir une
    // session expirée : on ne bloque pas l'affichage dessus (voir plus bas)
    repo
      .getSession()
      .then(setSession)
      .catch(() => {})
      .finally(() => setAuthReady(true));
    return repo.onAuthChange(setSession);
  }, [repo]);

  // Profil en mode local
  useEffect(() => {
    if (repo.mode === "local") setMeta("profile", { id: "local", displayName: "Moi", role: "admin" });
  }, [repo.mode]);

  // Synchro au lancement, à la connexion et au retour du réseau
  useEffect(() => {
    if (online && session) void syncNow();
  }, [online, session]);

  // …et en revenant sur l'appli : on voit ce que les autres membres du foyer ont changé
  useEffect(() => {
    if (!session) return;
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 20_000) return;
      last = Date.now();
      void syncNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session]);

  // Fonctions IA disponibles
  useEffect(() => {
    if (!online) return;
    fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => f && setMeta("features", f))
      .catch(() => {});
  }, [online]);

  const signOut = useCallback(async () => {
    await repo.signOut();
    await clearLocalData();
    setSession(null);
  }, [repo]);

  const profile = cachedProfile ?? null;
  const value = useMemo<AppState>(
    () => ({
      mode: repo.mode,
      session,
      profile,
      online,
      syncing: syncStatus.syncing,
      syncError: syncStatus.error,
      features,
      canEdit: profile?.role === "admin" || profile?.role === "editor",
      isAdmin: profile?.role === "admin",
      sync: syncNow,
      signOut,
      toast,
    }),
    [repo.mode, session, profile, online, syncStatus, features, signOut, toast],
  );

  // Hors ligne avec un profil en cache : on laisse lire sans session valide.
  const needsLogin = repo.mode === "supabase" && authReady && !session && (online || !profile);

  return (
    <Ctx.Provider value={value}>
      {/* profil en cache (déjà connectée sur cet appareil) : on affiche tout de suite les données locales */}
      {repo.mode === "supabase" && !authReady && !profile ? null : needsLogin ? <LoginScreen /> : children}
      {toastMsg && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-28 z-[60] mx-auto max-w-md rounded-full bg-neutral-900 px-5 py-3 text-center text-[15px] font-semibold text-neutral-100 shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </Ctx.Provider>
  );
}
