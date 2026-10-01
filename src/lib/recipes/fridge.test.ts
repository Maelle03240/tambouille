import { describe, expect, it } from "vitest";
import { emptyIngredient, emptyRecipe } from "./factory";
import { fridgeMatches, ingredientMatches } from "./fridge";
import type { Recipe } from "./types";

function recipe(title: string, names: string[]): Recipe {
  return { ...emptyRecipe(), title, ingredients: names.map((n, i) => ({ ...emptyIngredient(i), name: n })) };
}

const omelette = recipe("Omelette", ["œufs", "sel", "poivre", "beurre"]);
const curry = recipe("Curry", ["pois chiches", "lait de coco", "oignons", "curry"]);
const gratin = recipe("Gratin de courgettes", ["courgettes", "crème", "gruyère râpé", "œufs"]);

describe("frigo vide", () => {
  it("reconnaît un ingrédient malgré pluriel, accents et petits mots", () => {
    expect(ingredientMatches("œufs", "oeuf")).toBe(true);
    expect(ingredientMatches("courgettes", "Courgette")).toBe(true);
    expect(ingredientMatches("lait de coco", "lait coco")).toBe(true);
    expect(ingredientMatches("gruyère râpé", "gruyere")).toBe(true);
    expect(ingredientMatches("pois chiches", "pois")).toBe(true);
    expect(ingredientMatches("poivre", "poivron")).toBe(false);
  });

  it("classe par ingrédients manquants, basiques comptés comme présents", () => {
    const res = fridgeMatches([omelette, curry, gratin], ["œufs", "beurre"], ["sel", "poivre"]);
    expect(res.map((m) => m.recipe.title)).toEqual(["Omelette", "Gratin de courgettes"]);
    expect(res[0].missing).toEqual([]);
    expect(res[1].missing).toEqual(["courgettes", "crème", "gruyère râpé"]);
  });

  it("ignore les recettes sans aucun produit du frigo", () => {
    expect(fridgeMatches([curry], ["œufs"], ["sel"])).toEqual([]);
    expect(fridgeMatches([curry], [])).toEqual([]);
  });

  it("sucre ≠ sucre roux / glace / cassonade ; pâtes ≠ pâte brisée ; épices → cumin", () => {
    const cookies = recipe("Cookies", ["cassonade", "sucre roux", "sucre glace", "sucre en poudre", "farine"]);
    expect(fridgeMatches([cookies], ["farine"], ["sucre"])[0].missing).toEqual(["cassonade", "sucre roux", "sucre glace"]);
    expect(fridgeMatches([cookies], ["sucre roux"])[0].have).toEqual(["sucre roux"]);
    const tarte = recipe("Tarte", ["pâte brisée", "pommes", "cumin"]);
    expect(fridgeMatches([tarte], ["pommes"], ["pâtes", "épices"])[0].missing).toEqual(["pâte brisée"]);
    const cake = recipe("Cake", ["olives vertes", "huile"]);
    expect(fridgeMatches([cake], ["huile"])[0].missing).toEqual(["olives vertes"]);
  });

  it("celles qui utilisent le plus de mes produits d'abord", () => {
    const a = recipe("A", ["courgettes", "poulet", "riz", "crème", "curry"]);
    const b = recipe("B", ["courgettes", "œufs"]);
    const res = fridgeMatches([b, a], ["courgettes", "poulet"]);
    expect(res.map((m) => m.recipe.title)).toEqual(["A", "B"]);
  });

  it("rien de noté : seulement ce qu'on peut faire avec les basiques", () => {
    const res = fridgeMatches([omelette, curry], [], ["œufs", "beurre", "sel", "poivre"]);
    expect(res.map((m) => m.recipe.title)).toEqual(["Omelette"]);
  });
});
