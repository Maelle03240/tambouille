import { describe, expect, it } from "vitest";
import { emptyRecipe } from "./factory";
import { visibleRecipes } from "./visibility";
import type { Recipe } from "./types";

const r = (id: string, extra: Partial<Recipe> = {}): Recipe => ({ ...emptyRecipe(), id, title: id, ...extra });

const all = [
  r("cake"),
  r("curry"),
  r("cake-lea", { status: "personal", ownerId: "lea", forkedFromId: "cake" }),
  r("tarte-lea", { status: "personal", ownerId: "lea" }),
  r("soupe-tom", { status: "personal", ownerId: "tom" }),
];
const ids = (list: Recipe[]) => list.map((x) => x.id);

describe("recettes visibles dans mes listes", () => {
  it("ma version remplace l'originale pour moi", () => {
    expect(ids(visibleRecipes(all, "lea", []))).toEqual(["curry", "cake-lea", "tarte-lea"]);
  });
  it("les recettes perso des membres de mes foyers apparaissent à côté de l'originale", () => {
    expect(ids(visibleRecipes(all, "maman", ["lea"]))).toEqual(["cake", "curry", "cake-lea", "tarte-lea"]);
  });
  it("l'admin hors du foyer ne les voit pas dans ses listes", () => {
    expect(ids(visibleRecipes(all, "admin", []))).toEqual(["cake", "curry"]);
  });
  it("mode local : tout", () => expect(visibleRecipes(all, null, []).length).toBe(5));
});
