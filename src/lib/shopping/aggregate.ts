/**
 * LISTE DE COURSES (spec §9) : additionne les ingrédients des recettes
 * choisies (même nom + même unité, conversions g/kg et ml/cl/l), les range
 * par rayon et repère les basiques (toujours dans les placards).
 * Fonctions pures, testées dans shopping.test.ts.
 */
import { AISLES, guessAisle } from "@/config/aisles";
import { displayQuantity, withDe } from "@/lib/recipes/quantities";
import type { Recipe } from "@/lib/recipes/types";

export interface ShoppingSource {
  recipe: Recipe;
  /** Quantité à cuisiner, dans l'unité de rendement de la recette (4 personnes, 12 cookies…). */
  servings: number;
}

export interface ShoppingItem {
  key: string;
  aisle: string;
  /** « 450 g », « 3 », « » si pas de quantité. */
  amount: string;
  /** « de farine », « oignons », « sel ». */
  label: string;
  /** Recettes d'où vient l'article. */
  from: string[];
  basic: boolean;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .trim();

/** Unités convertibles ramenées à une base commune. */
const BASE: Record<string, [string, number]> = {
  mg: ["g", 0.001],
  g: ["g", 1],
  kg: ["g", 1000],
  ml: ["ml", 1],
  cl: ["ml", 10],
  dl: ["ml", 100],
  l: ["ml", 1000],
};

export function isBasic(name: string, basics: string[]): boolean {
  const words = fold(name).split(/[^a-z0-9']+/).filter(Boolean);
  return basics.some((b) => {
    const bw = fold(b).split(/\s+/).filter(Boolean);
    return bw.length > 0 && bw.every((w) => words.includes(w));
  });
}

export function aggregate(sources: ShoppingSource[], basics: string[] = []): ShoppingItem[] {
  type Acc = { name: string; unit: string; total: number | null; aisle: string; from: Set<string> };
  const acc = new Map<string, Acc>();

  for (const { recipe, servings } of sources) {
    const factor = recipe.yieldQuantity ? servings / recipe.yieldQuantity : 1;
    for (const ing of recipe.ingredients) {
      const name = ing.name.trim();
      if (!name) continue;
      const base = BASE[ing.unit];
      const unit = base ? base[0] : ing.unit;
      const hasQty = ing.quantity != null && ing.scalable;
      const qty = hasQty ? ing.quantity! * (base ? base[1] : 1) * factor : null;
      const key = `${fold(name)}|${hasQty ? unit : "-"}`;
      const cur = acc.get(key);
      if (cur) {
        if (qty != null) cur.total = (cur.total ?? 0) + qty;
        cur.from.add(recipe.title);
      } else {
        acc.set(key, { name, unit, total: qty, aisle: ing.aisle || guessAisle(name), from: new Set([recipe.title]) });
      }
    }
  }

  return [...acc.entries()]
    .map(([key, a]) => {
      // en magasin on pense en cl : 400 ml → 40 cl
      const toCl = a.unit === "ml" && a.total != null && a.total >= 100 && a.total < 1000;
      const q = displayQuantity(toCl ? a.total! / 10 : a.total, toCl ? "cl" : a.unit, 1, { round: true });
      return {
        key,
        name: fold(a.name),
        aisle: (AISLES as readonly string[]).includes(a.aisle) ? a.aisle : "Autre",
        amount: q.amount,
        label: q.amount && q.unit ? withDe(a.name) : a.name,
        from: [...a.from],
        basic: isBasic(a.name, basics),
      };
    })
    .sort((x, y) => AISLES.indexOf(x.aisle as never) - AISLES.indexOf(y.aisle as never) || x.name.localeCompare(y.name, "fr"))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ name, ...item }) => item);
}

/** Texte à partager (Notes, Keep…), groupé par rayon. */
export function toShareText(items: ShoppingItem[], title = "Courses"): string {
  const lines = [title];
  for (const aisle of AISLES) {
    const its = items.filter((i) => i.aisle === aisle);
    if (!its.length) continue;
    lines.push("", aisle.toUpperCase());
    for (const i of its) lines.push(`- ${i.amount ? `${i.amount} ${i.label}` : i.label.charAt(0).toUpperCase() + i.label.slice(1)}`);
  }
  return lines.join("\n");
}
