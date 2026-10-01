import { describe, expect, it } from "vitest";
import { emptyIngredient, emptyRecipe } from "./factory";
import { applyBlocks, defaultTake, forkRecipe, reviewProposal, toOriginalIds } from "./proposals";
import type { Recipe } from "./types";

let n = 0;
const makeId = () => `id-${++n}`;

function cake(): Recipe {
  const farine = { ...emptyIngredient(0), id: "farine", name: "farine", quantity: 200, unit: "g" };
  const sucre = { ...emptyIngredient(1), id: "sucre", name: "sucre", quantity: 100, unit: "g" };
  return {
    ...emptyRecipe(),
    id: "cake",
    title: "Cake",
    tags: ["a-tester"],
    ingredients: [farine, sucre],
    steps: [{ id: "s1", position: 0, text: "Mélanger {{ing:farine}} et {{ing:sucre}}.", timerMinutes: null }],
  };
}

describe("versions perso et propositions", () => {
  it("la version perso a ses propres ids, marqueurs suivis, et garde l'originale", () => {
    const fork = forkRecipe(cake(), "lea", makeId);
    expect(fork.id).not.toBe("cake");
    expect(fork.status).toBe("personal");
    expect(fork.forkedFromId).toBe("cake");
    expect(fork.ingredients.map((i) => i.id)).not.toContain("farine");
    expect(fork.steps[0].text).toContain(`{{ing:${fork.ingredients[0].id}}}`);
    expect(toOriginalIds(fork, makeId).steps[0].text).toBe("Mélanger {{ing:farine}} et {{ing:sucre}}.");
  });

  it("rien de changé : aucune proposition ; le tag Nouveau ne compte pas", () => {
    const fork = { ...forkRecipe(cake(), "lea", makeId), tags: [] };
    expect(reviewProposal(fork, cake(), makeId).changed).toEqual([]);
  });

  it("repère les blocs changés et fusionne avec les ids de l'originale", () => {
    const fork = forkRecipe(cake(), "lea", makeId);
    fork.title = "Cake de Léa";
    fork.ingredients = [{ ...fork.ingredients[0], quantity: 250 }, fork.ingredients[1], { ...emptyIngredient(2), id: "beurre-lea", name: "beurre" }];
    const review = reviewProposal(fork, cake(), makeId);
    expect(review.changed).toEqual(["title", "content"]);
    expect(review.conflicts).toEqual([]);
    const merged = applyBlocks(cake(), review.theirs, defaultTake(review));
    expect(merged.id).toBe("cake");
    expect(merged.title).toBe("Cake de Léa");
    expect(merged.ingredients.map((i) => i.id).slice(0, 2)).toEqual(["farine", "sucre"]);
    expect(merged.ingredients[0].quantity).toBe(250);
    expect(merged.ingredients[2].id).not.toBe("beurre-lea"); // nouvel id (la version perso existe encore)
    expect(merged.steps[0].id).toBe("s1");
    expect(merged.tags).toEqual(["a-tester"]);
  });

  it("l'admin a changé le même bloc entre-temps : conflit, sa version reste par défaut", () => {
    const fork = forkRecipe(cake(), "lea", makeId);
    fork.title = "Cake de Léa";
    fork.prepMinutes = 15;
    const current = { ...cake(), title: "Cake moelleux" };
    const review = reviewProposal(fork, current, makeId);
    expect(review.changed).toEqual(["title", "times"]);
    expect(review.conflicts).toEqual(["title"]);
    const merged = applyBlocks(current, review.theirs, defaultTake(review));
    expect(merged.title).toBe("Cake moelleux");
    expect(merged.prepMinutes).toBe(15);
  });

  it("deux propositions sur la même recette : les deux s'appliquent l'une après l'autre", () => {
    const a = forkRecipe(cake(), "lea", makeId);
    a.title = "Cake de Léa";
    const b = forkRecipe(cake(), "tom", makeId);
    b.cookMinutes = 40;
    let current = cake();
    const ra = reviewProposal(a, current, makeId);
    current = applyBlocks(current, ra.theirs, defaultTake(ra));
    const rb = reviewProposal(b, current, makeId);
    expect(rb.conflicts).toEqual([]);
    current = applyBlocks(current, rb.theirs, defaultTake(rb));
    expect([current.title, current.cookMinutes]).toEqual(["Cake de Léa", 40]);
  });
});
