"use client";
import { useEffect, useState } from "react";

export type WakeLockStatus = "pending" | "active" | "unsupported" | "refused";

/**
 * Garde l'écran allumé tant que le mode cuisine est ouvert (Screen Wake Lock).
 * Le système peut relâcher le verrou (appli en arrière-plan, batterie faible) :
 * on le redemande dès que la page redevient visible.
 * Renvoie l'état pour l'afficher (témoin dans le mode cuisine).
 * iPhone : fonctionne dans l'appli installée à partir d'iOS 18.4.
 */
export function useWakeLock(): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("pending");

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function request() {
      if (!("wakeLock" in navigator)) return setStatus("unsupported");
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) return void lock.release();
        setStatus("active");
        lock.addEventListener("release", () => {
          if (!cancelled && document.visibilityState === "visible") void request();
        });
      } catch {
        setStatus("refused");
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  return status;
}
