/**
 * Illustrations IA (V2) — CÔTÉ SERVEUR UNIQUEMENT.
 * Emplacement prévu dès la V1 ; pas encore branché à l'interface.
 * Désactivé si CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN sont absents :
 * l'appli garde alors les couvertures typographiques.
 */
import "server-only";

/** Style imposé à toutes les illustrations (spec §8). */
export const ILLUSTRATION_STYLE =
  "ink and watercolor illustration in the style of an old French cookbook, cream paper background, soft muted colors, hand-drawn, never photorealistic, no text";

export interface IllustrationGenerator {
  readonly name: string;
  /** Renvoie l'image (PNG/JPEG) ou lève une erreur. */
  generate(subject: string): Promise<Uint8Array>;
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
        body: JSON.stringify({ prompt: `${subject}. ${ILLUSTRATION_STYLE}`, steps: 4 }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) throw new Error(`Cloudflare a répondu ${res.status}`);
    const body = await res.json();
    const b64: string | undefined = body?.result?.image;
    if (!b64) throw new Error("Pas d'image dans la réponse");
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }
}

export function getIllustrationGenerator(): IllustrationGenerator | null {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  return id && token ? new CloudflareFluxGenerator(id, token) : null;
}

export const isIllustrationEnabled = () => getIllustrationGenerator() !== null;
