"use client";
import { useEffect } from "react";

/** Enregistre le service worker (public/sw.js) en production. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("Service worker non enregistré", e));
  }, []);
  return null;
}
