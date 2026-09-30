import { describe, expect, it } from "vitest";
import { emptyIngredient, emptyRecipe } from "@/lib/recipes/factory";
import type { Ingredient, Recipe } from "@/lib/recipes/types";
import { aggregate, isBasic, toShareText } from "./aggregate";

function ing(name: string, quantity: number | null, unit = "", extra: Partial<Ingredient> = {}): Ingredient {
  return { ...emptyIngredient(0), name, quantity, unit, ...extra };
}
function recipe(title: string, yieldQuantity: number, ingredients: Ingredient[]): Recipe {
  return { ...emptyRecipe(), title, yieldQuantity, ingredients };
}

const curry = recipe("Curry", 4, [ing("oignons", 2), ing("lait de coco", 40, "cl"), ing("sel", null, "", { scalable: false })]);
const ratatouille = recipe("Ratatouille", 4, [ing("oignons", 2), ing("tomates", 500, "g"), ing("huile d'olive", 5, "cl")]);
const gateau = recipe("Gâteau", 8, [ing("farine", 250, "g"), ing("lait", 0.5, "l"), ing("tomates", 1, "kg")]);

describe("liste de courses", () => {
  const items = aggregate(
    [
      { recipe: curry, servings: 4 },
      { recipe: ratatouille, servings: 4 },
      { recipe: gateau, servings: 8 },
    ],
    ["sel", "huile d'olive"],
  );
  const find = (label: string) => items.find((i) => i.label.includes(label))!;

  it("additionne même nom + même unité", () => {
    expect(find("oignons").amount).toBe("4");
    expect(find("oignons").from).toEqual(["Curry", "Ratatouille"]);
  });
  it("convertit g / kg", () => expect(find("tomates").amount).toBe("1,5 kg"));
  it("garde les ml / cl / l séparés du reste et convertis", () => expect(find("lait de coco").amount).toBe("40 cl"));
  it("range par rayon, inconnu → Autre", () => {
    expect(find("oignons").aisle).toBe("Fruits & légumes");
    expect(find("farine").aisle).toBe("Épicerie");
  });
  it("repère les basiques", () => {
    expect(find("sel").basic).toBe(true);
    expect(find("huile").basic).toBe(true);
    expect(find("farine").basic).toBe(false);
  });
  it("met à l'échelle selon les portions", () => {
    const half = aggregate([{ recipe: gateau, servings: 4 }]);
    expect(half.find((i) => i.label.includes("farine"))!.amount).toBe("130 g");
  });
  it("texte à partager groupé par rayon", () => {
    const t = toShareText(items.filter((i) => !i.basic));
    expect(t).toContain("FRUITS & LÉGUMES\n- 4 oignons");
    expect(t).not.toContain("sel");
  });
  it("basique : mots entiers seulement", () => {
    expect(isBasic("gros sel", ["sel"])).toBe(true);
    expect(isBasic("selle d'agneau", ["sel"])).toBe(false);
  });
});
