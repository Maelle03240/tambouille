/**
 * Récupère le texte d'une page de recette (côté serveur). Si la page contient
 * des données structurées schema.org/Recipe (Ricardo, Marmiton…), on les
 * utilise en priorité : plus fiable que le texte de la page.
 */
import "server-only";

const MAX_CHARS = 30_000;

export async function fetchPageText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Lien invalide.");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Seuls les liens http(s) sont acceptés.");
  if (/(^|\.)instagram\.com$|(^|\.)tiktok\.com$|(^|\.)facebook\.com$/.test(parsed.hostname)) {
    throw new Error("Ce réseau social bloque la lecture des liens : fais plutôt une capture d'écran ou copie le texte de la publication.");
  }

  const res = await fetch(parsed, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CarnetTambouille/1.0)", Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`La page n'a pas pu être lue (erreur ${res.status}).`);
  const html = await res.text();

  const structured = extractJsonLdRecipe(html);
  if (structured) return `Source : ${url}\n\n${structured}`.slice(0, MAX_CHARS);
  return `Source : ${url}\n\n${htmlToText(html)}`.slice(0, MAX_CHARS);
}

function extractJsonLdRecipe(html: string): string | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of blocks) {
    try {
      const found = findRecipe(JSON.parse(json.trim()));
      if (found) return JSON.stringify(found, null, 1);
    } catch {
      /* bloc illisible : on passe au suivant */
    }
  }
  return null;
}

function findRecipe(node: unknown): unknown {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
  return findRecipe(obj["@graph"]);
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
