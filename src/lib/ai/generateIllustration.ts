/**
 * Illustrations IA — CÔTÉ SERVEUR UNIQUEMENT.
 * Désactivé si CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN sont absents :
 * l'appli garde alors les couvertures typographiques.
 */
import "server-only";
import { geminiJson } from "./providers/gemini";

/** Modèle Cloudflare Workers AI (rapide, ~2 s). Autres essayés : flux-2-dev (1 min), flux-1-schnell (trop simple). */
const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

/**
 * Style imposé à toutes les illustrations : gouache détaillée façon livre de
 * cuisine, plat seul sur fond blanc uni (fondu dans la couleur de la carte à
 * l'affichage, via mix-blend-mode: multiply).
 */
export const ILLUSTRATION_STYLE =
  "Rich painterly texture, realistic proportions, warm natural colors, soft lighting, cookbook illustration style, the food alone isolated on a plain pure white background, no table, no text.";

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
  readonly name = MODEL;
  constructor(
    private accountId: string,
    private token: string,
  ) {}

  async generate(subject: string) {
    // les modèles FLUX.2 de Cloudflare prennent un formulaire, pas du JSON
    const form = new FormData();
    form.append("prompt", `A detailed gouache food illustration of ${subject}. ${ILLUSTRATION_STYLE}`);
    form.append("width", "768");
    form.append("height", "768");
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // filtre de Cloudflare aléatoire (« apple tart » refusé puis accepté) : l'appelant réessaie
      if (/NSFW/i.test(detail)) throw new FilteredPromptError();
      if (res.status === 429) throw new Error("Quota gratuit d'illustrations atteint pour aujourd'hui. Réessaie demain.");
      throw new Error(`Cloudflare a répondu ${res.status}`);
    }
    const body = await res.json();
    const b64: string | undefined = body?.result?.image;
    if (!b64) throw new Error("Pas d'image dans la réponse");
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
}

export interface DishInfo {
  title: string;
  ingredients?: string[];
  /** Tag « meal prep » : dessiné dans une boîte en verre transparente. */
  mealPrep?: boolean;
}

const MEAL_PREP = "in a clear transparent glass meal prep container with the lid open, the food clearly visible through the glass";

/**
 * Ce qu'on demande de dessiner. FLUX gère mal les noms perso (« de mamie »),
 * écrit sur l'image ce qui est entre guillemets et dessine crus les ingrédients
 * cités : Gemini (s'il est configuré) traduit donc la recette en une courte
 * description visuelle du plat servi, en anglais. Sinon : le nom seul.
 */
export async function describeDish(dish: DishInfo): Promise<string> {
  const plain = plainSubject(dish);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return plain;
  try {
    const out = (await geminiJson({
      apiKey,
      system:
        "You write the subject of an illustration of a finished dish. Answer in English, one visual phrase (max 25 words): the dish and how it is served (plate, bowl, glass, baking paper…), its look, colors, garnish and viewing angle. Plain food words only (say pie, not tart). Never names of people or places, never quotes, nothing else around it. " +
        // retours après usage : cakes ronds, cookies sans pépites, brownie saupoudré, œuf posé sur la brick
        "Keep the real shape: a French « cake » (sweet or savory) is a rectangular loaf baked in a loaf pan, shown as a loaf with one slice cut. " +
        "Show the key visible ingredients (chocolate chips in cookies, olives and ham pieces in a savory cake…). " +
        "Nothing sprinkled on top (no powdered sugar, salt or seeds) unless an ingredient says so. " +
        "A filled or wrapped dish (brick, samosa, crêpe, burrito) is shown cut open with its filling inside, not on top." +
        (dish.mealPrep ? ` The dish is served ${MEAL_PREP}.` : ""),
      schema: { type: "OBJECT", properties: { subject: { type: "STRING" } }, required: ["subject"] },
      parts: [{ text: `Recette : ${dish.title}\nIngrédients : ${(dish.ingredients ?? []).slice(0, 14).join(", ")}` }],
    })) as { subject?: string } | null;
    const subject = out?.subject?.replace(/["«»“”]/g, "").trim();
    return subject || plain;
  } catch {
    return plain;
  }
}

/** Génère l'illustration d'une recette ; si le filtre refuse, réessaie, puis avec le nom seul. */
export async function illustrateRecipe(gen: IllustrationGenerator, dish: DishInfo) {
  const subject = await describeDish(dish);
  const attempts = [subject, subject, plainSubject(dish)];
  for (let i = 0; ; i++) {
    try {
      return await gen.generate(attempts[i]);
    } catch (e) {
      if (!(e instanceof FilteredPromptError) || i === attempts.length - 1) throw e;
    }
  }
}

const plainSubject = (dish: DishInfo) =>
  `${dish.title.replace(/["«»“”]/g, "")}${dish.mealPrep ? `, ${MEAL_PREP}` : ", served on a plate"}`;

export function getIllustrationGenerator(): IllustrationGenerator | null {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  return id && token ? new CloudflareFluxGenerator(id, token) : null;
}

export const isIllustrationEnabled = () => getIllustrationGenerator() !== null;
