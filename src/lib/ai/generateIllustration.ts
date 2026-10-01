/**
 * Illustrations IA (V2) — CÔTÉ SERVEUR UNIQUEMENT.
 * Emplacement prévu dès la V1 ; pas encore branché à l'interface.
 * Désactivé si CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN sont absents :
 * l'appli garde alors les couvertures typographiques.
 */
import "server-only";
import { geminiJson } from "./providers/gemini";

/** Style imposé à toutes les illustrations (spec §8). */
export const ILLUSTRATION_STYLE =
  "ink and watercolor illustration in the style of an old French cookbook, cream paper background, soft muted colors, hand-drawn, never photorealistic, no text";

export interface IllustrationGenerator {
  readonly name: string;
  /** Renvoie l'image (PNG/JPEG) ou lève une erreur. */
  generate(subject: string): Promise<Uint8Array>;
}

export class FilteredPromptError extends Error {
  constructor() {
    super("Cloudflare a refusé l'image (filtre). Réessaie.");
  }
}

class CloudflareFluxGenerator implements IllustrationGenerator {
  readonly name = "cloudflare-flux-schnell";
  constructor(
    private accountId: string,
    private token: string,
  ) {}

  async generate(subject: string) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        // le style en tête : sinon une description détaillée tire vers la photo
        body: JSON.stringify({ prompt: `Hand-drawn ink and watercolor illustration of ${subject}. ${ILLUSTRATION_STYLE}`, steps: 4 }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // filtre de Cloudflare aléatoire (« apple tart » refusé puis accepté) : l'appelant réessaie
      if (/NSFW/i.test(detail)) throw new FilteredPromptError();
      throw new Error(`Cloudflare a répondu ${res.status}`);
    }
    const body = await res.json();
    const b64: string | undefined = body?.result?.image;
    if (!b64) throw new Error("Pas d'image dans la réponse");
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
}

/**
 * Ce qu'on demande de dessiner. FLUX gère mal les noms perso (« de mamie »),
 * écrit sur l'image ce qui est entre guillemets et dessine crus les ingrédients
 * cités : Gemini (s'il est configuré) traduit donc la recette en une courte
 * description visuelle du plat servi, en anglais. Sinon : le nom seul.
 */
export async function describeDish(title: string, ingredients: string[] = []): Promise<string> {
  const plain = plainSubject(title);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return plain;
  try {
    const out = (await geminiJson({
      apiKey,
      system:
        "You write the subject of an illustration of a finished, served dish. Answer in English, one short simple phrase (max 12 words): the dish as served (plate, bowl, glass…) and its main look. Plain food words only (say pie, not tart). Never names of people or places, never quotes.",
      schema: { type: "OBJECT", properties: { subject: { type: "STRING" } }, required: ["subject"] },
      parts: [{ text: `Recette : ${title}
Ingrédients : ${ingredients.slice(0, 8).join(", ")}` }],
    })) as { subject?: string } | null;
    const subject = out?.subject?.replace(/["«»“”]/g, "").trim();
    return subject || plain;
  } catch {
    return plain;
  }
}

/** Génère l'illustration d'une recette ; si le filtre refuse, réessaie, puis avec le nom seul. */
export async function illustrateRecipe(gen: IllustrationGenerator, title: string, ingredients: string[] = []) {
  const subject = await describeDish(title, ingredients);
  const attempts = [subject, subject, plainSubject(title)];
  for (let i = 0; ; i++) {
    try {
      return await gen.generate(attempts[i]);
    } catch (e) {
      if (!(e instanceof FilteredPromptError) || i === attempts.length - 1) throw e;
    }
  }
}

const plainSubject = (title: string) => `a single plate of ${title.replace(/["«»“”]/g, "")}`;

export function getIllustrationGenerator(): IllustrationGenerator | null {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  return id && token ? new CloudflareFluxGenerator(id, token) : null;
}

export const isIllustrationEnabled = () => getIllustrationGenerator() !== null;
