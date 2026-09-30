/**
 * Service worker du carnet — rend l'appli utilisable sans réseau.
 * GÉNÉRÉ : ce modèle est copié dans public/sw.js par scripts/build-sw.mjs
 * (avant chaque build) avec un numéro de version, pour que chaque
 * déploiement remplace l'ancien cache.
 *
 * Stratégies :
 *  - pages (navigation)  : réseau d'abord (4 s max), sinon cache — les pages
 *    sont mises en cache sans leurs paramètres (?id=…) : /recette sert
 *    n'importe quelle recette, les données venant d'IndexedDB ;
 *  - /_next/static/*     : cache d'abord (fichiers versionnés, immuables) ;
 *  - icônes, polices…    : cache puis mise à jour en arrière-plan ;
 *  - /api/* et autres domaines (Supabase, IA) : jamais mis en cache.
 */
const VERSION = "__VERSION__";
const CACHE = `tambouille-${VERSION}`;
const ROUTES = __ROUTES__;
const ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-48.png"];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(ASSETS.map((a) => cache.add(a)));
      const statics = new Set();
      for (const route of ROUTES) {
        try {
          const res = await fetch(route, { cache: "reload" });
          if (!res.ok) continue;
          const html = await res.clone().text();
          await cache.put(route, res);
          for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) statics.add(m[0]);
        } catch {}
      }
      // les feuilles de style référencent les polices
      for (const url of [...statics].filter((u) => u.endsWith(".css"))) {
        try {
          const css = await (await fetch(url)).text();
          for (const m of css.matchAll(/\/_next\/static\/media\/[^"'\s)]+/g)) statics.add(m[0]);
        } catch {}
      }
      await Promise.allSettled([...statics].map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("tambouille-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const key = url.pathname;
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    return (await cache.match(key)) || (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  return hit || refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // données de navigation interne de Next (RSC) : réseau seulement ; hors
  // ligne, Next repasse en navigation classique, servie par le cache ci-dessous
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") return event.respondWith(networkFirstPage(request));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  event.respondWith(staleWhileRevalidate(request));
});
