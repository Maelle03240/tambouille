import { describe, expect, it } from "vitest";
import { per100g, portionCount, portionGrams, portionLabel, portionTitle, rescaleNutrition, unitFor, isPortionTooBig } from "./portions";

const cookies = {
  yieldQuantity: 25,
  yieldUnit: "cookies",
  portionSize: 1,
  totalWeightG: 925,
  ingredients: [],
  kcal: 160,
  proteinG: 2,
  fatG: 7.5,
  carbsG: 20.5,
  fiberG: 0.6,
};

describe("portions", () => {
  it("ce qu'est une portion", () => {
    expect(portionLabel(cookies)).toBe("1 cookie");
    expect(portionLabel({ ...cookies, portionSize: 2 })).toBe("2 cookies");
    expect(portionLabel({ ...cookies, yieldUnit: "c. à soupe" })).toBe("1 c. à soupe");
    expect(portionLabel({ ...cookies, yieldUnit: "personnes" })).toBeNull();
    expect(unitFor(1, "personnes")).toBe("personne");
    expect(portionTitle({ ...cookies, portionSize: 2 })).toBe("Pour 1 portion = 2 cookies");
    expect(portionTitle({ ...cookies, yieldUnit: "personnes" })).toBe("Pour 1 personne");
  });

  it("nombre et poids", () => {
    expect(portionCount({ ...cookies, portionSize: 2 })).toBe(12.5);
    expect(portionGrams(cookies)).toBe(37);
    expect(Math.round(per100g(cookies)!.kcal!)).toBe(432);
  });

  it("valeurs par portion qui suivent le rendement", () => {
    expect(rescaleNutrition(cookies, { ...cookies, portionSize: 2 }).kcal).toBe(320);
    expect(rescaleNutrition(cookies, { ...cookies, yieldQuantity: 20 }).kcal).toBe(200);
    expect(rescaleNutrition(cookies, { ...cookies, title: "x" } as typeof cookies).kcal).toBe(160);
  });
});

describe("garde-fous des portions", () => {
  const ing = (g: number) => [{ gramsEstimate: g }] as never;
  const base = { yieldQuantity: 4, yieldUnit: "personnes", portionSize: 1, totalWeightG: null, ingredients: ing(2736) };
  it("« portions » = par personne", () => expect(portionTitle({ ...base, yieldUnit: "portions" })).toBe("Pour 1 portion"));
  it("poids total sous la moitié des ingrédients : ignoré", () => {
    expect(portionGrams({ ...base, totalWeightG: 515 })).toBe(684);
    expect(portionGrams({ ...base, totalWeightG: 2000 })).toBe(500);
  });
  it("portion plus grande que la recette : pas de valeur pour 100 g, et à revoir", () => {
    const pot = { ...base, yieldQuantity: 1, yieldUnit: "pot", portionSize: 30, kcal: 180, proteinG: 12, fatG: null, carbsG: null, fiberG: null };
    expect(per100g(pot)).toBeNull();
    expect(isPortionTooBig(pot)).toBe(true);
    expect(isPortionTooBig({ yieldQuantity: 25, yieldUnit: "cookies", portionSize: 2 })).toBe(false);
  });
});
