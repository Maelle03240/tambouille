import { describe, expect, it } from "vitest";
import { importToRecipe, parseImportJson } from "./import-format";
import { formatDuration, markersToTokens, parseDuration, parseStepText, stripArticlesBeforeTokens, tokensToMarkers } from "./markers";
import { displayQuantity, formatIngredient, parseIngredientLine, parseNumber, withDe } from "./quantities";

describe("parseNumber", () => {
  it.each([
    ["1,5", 1.5],
    ["1.5", 1.5],
    ["½", 0.5],
    ["1 ½", 1.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["2-3", 2],
    ["abc", null],
  ])("%s → %s", (input, expected) => expect(parseNumber(input)).toBe(expected));
});

describe("parseIngredientLine", () => {
  it.each([
    ["200 g de farine", 200, "g", "farine"],
    ["200g farine", 200, "g", "farine"],
    ["2 œufs", 2, "", "œufs"],
    ["sel", null, "", "sel"],
    ["1 c. à soupe d'huile d'olive", 1, "c. à soupe", "huile d'olive"],
    ["1 cs de sucre", 1, "c. à soupe", "sucre"],
    ["3 gousses d'ail", 3, "gousse", "ail"],
    ["1,5 kg de pommes reinettes", 1.5, "kg", "pommes reinettes"],
    ["½ citron", 0.5, "", "citron"],
    ["1 gros oignon", 1, "", "gros oignon"],
    ["40 cl de lait de coco", 40, "cl", "lait de coco"],
    ["1 pincée de sel", 1, "pincée", "sel"],
    ["2 l d'eau", 2, "l", "eau"],
  ])("%s", (line, q, u, n) => {
    expect(parseIngredientLine(line)).toEqual({ quantity: q, unit: u, name: n });
  });
});

describe("displayQuantity : arrondis lisibles", () => {
  it("œufs : jamais 1,333", () => expect(displayQuantity(2, "", 2 / 3).amount).toBe("1 ½"));
  it("œufs : grands nombres entiers", () => expect(displayQuantity(3, "", 2).amount).toBe("6"));
  it("grammes arrondis à 5", () => expect(displayQuantity(55, "g", 1.5).amount).toBe("85 g"));
  it("grammes arrondis à 10", () => expect(displayQuantity(125, "g", 1.5).amount).toBe("190 g"));
  it("passage en kg", () => expect(displayQuantity(750, "g", 2).amount).toBe("1,5 kg"));
  it("kg sous 1 → g", () => expect(displayQuantity(1.5, "kg", 0.5).amount).toBe("750 g"));
  it("cuillères en demis", () => expect(displayQuantity(1, "c. à soupe", 1.5).amount).toBe("1 ½ c. à soupe"));
  it("pluriel d'unité", () => expect(displayQuantity(1, "gousse", 2).amount).toBe("2 gousses"));
  it("sans quantité", () => expect(displayQuantity(null, "", 2).amount).toBe(""));
  it("portions d'origine : quantité exacte", () => {
    expect(displayQuantity(125, "ml").amount).toBe("125 ml");
    expect(displayQuantity(1.3, "", 1).amount).toBe("1,3");
    expect(displayQuantity(1500, "g").amount).toBe("1,5 kg");
  });
});

describe("formatIngredient", () => {
  it("unité + de", () => expect(formatIngredient({ quantity: 200, unit: "g", name: "farine", scalable: true })).toEqual({ amount: "200 g", rest: "de farine", value: 200 }));
  it("élision", () => expect(withDe("huile d'olive")).toBe("d'huile d'olive"));
  it("non ajustable", () => expect(formatIngredient({ quantity: 1, unit: "pincée", name: "sel", scalable: false }, 3).amount).toBe("1 pincée"));
});

describe("durées", () => {
  it.each([["8 min", 8], ["1 h 30", 90], ["1h30", 90], ["2 h", 120], ["45 s", 0.75], ["farine", null]])("%s", (s, m) =>
    expect(parseDuration(s)).toBe(m),
  );
  it("format", () => {
    expect(formatDuration(8)).toBe("8 min");
    expect(formatDuration(90)).toBe("1 h 30");
    expect(formatDuration(60)).toBe("1 h");
  });
});

describe("marqueurs d'étapes", () => {
  const ings = [
    { id: "a", name: "beurre" },
    { id: "b", name: "pain de mie" },
    { id: "c", name: "huile d'olive" },
    { id: "d", name: "huile d'olive" },
  ];

  it("jetons → marqueurs → jetons", () => {
    const src = "Faites fondre {beurre}, ajoutez {pain de mie} et dorez {8 min}. Puis {huile d'olive#2}.";
    const { text, unresolved } = tokensToMarkers(src, ings);
    expect(unresolved).toEqual([]);
    expect(text).toBe("Faites fondre {{ing:a}}, ajoutez {{ing:b}} et dorez {{timer:8}}. Puis {{ing:d}}.");
    expect(markersToTokens(text, ings)).toBe(src);
  });

  it("jeton inconnu gardé en texte", () => {
    expect(tokensToMarkers("Ajoutez {truffe}.", ings)).toEqual({ text: "Ajoutez truffe.", unresolved: ["truffe"] });
  });

  it("ne retouche pas un marqueur existant", () => {
    expect(tokensToMarkers("{{ing:a}} {5 min}", ings).text).toBe("{{ing:a}} {{timer:5}}");
  });

  it("retire l'article devant un ingrédient, pas devant une durée", () => {
    expect(stripArticlesBeforeTokens("Mettre la {farine}, les {œufs} et du {beurre} dans l'{huile}, laisser la {10 min}."))
      .toBe("Mettre {farine}, {œufs} et {beurre} dans {huile}, laisser la {10 min}.");
  });

  it("découpe", () => {
    expect(parseStepText("Dorez {{ing:a}} {{timer:3}}.")).toEqual([
      { type: "text", value: "Dorez " },
      { type: "ing", id: "a" },
      { type: "text", value: " " },
      { type: "timer", minutes: 3 },
      { type: "text", value: "." },
    ]);
  });
});

describe("import JSON", () => {
  it("convertit un import complet", () => {
    const json = JSON.stringify({
      title: "Tarte tatin",
      category: "dessert",
      yield_quantity: 6,
      yield_unit: "personnes",
      prep_minutes: "20",
      ingredients: [{ text: "1,5 kg de pommes" }, { text: "150 g de sucre" }],
      steps: ["Épluchez {pommes}.", "Caramel avec {sucre} {8 min}."],
      nutrition_per_portion: { kcal: 320, protein_g: 3 },
      uncertain: [{ field: "ingredients.1.quantity", question: "150 ou 160 g ?", options: ["150 g de sucre", "160 g de sucre"] }],
    });
    const parsed = parseImportJson("```json\n" + json + "\n```");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { recipe, doubts } = importToRecipe(parsed.data, "json");
    expect(recipe.prepMinutes).toBe(20);
    expect(recipe.ingredients[0]).toMatchObject({ quantity: 1.5, unit: "kg", name: "pommes" });
    expect(recipe.steps[1].text).toBe(`Caramel avec {{ing:${recipe.ingredients[1].id}}} {{timer:8}}.`);
    expect(recipe.steps[1].timerMinutes).toBe(8);
    expect(recipe.tags).toContain("a-tester");
    expect(doubts[0].key).toBe(`ingredient:${recipe.ingredients[1].id}`);
  });

  it("ancienne catégorie « goûter » → dessert + moment goûter", () => {
    const res = parseImportJson(JSON.stringify({ title: "Brownies", category: "gouter", moments: ["gouter", "inconnu"] }));
    if (!res.ok) throw new Error(res.error);
    const { recipe } = importToRecipe(res.data, "photo");
    expect(recipe.category).toBe("dessert");
    expect(recipe.moments).toEqual(["gouter"]);
  });

  it("refuse un JSON invalide avec un message clair", () => {
    const res = parseImportJson("{ pas du json");
    expect(res.ok).toBe(false);
  });
});

describe("ingrédients perso", () => {
  const customs = [
    { id: "s", name: "Skyr", kcal100: 60, protein100: 11, fat100: 0, carbs100: 4, fiber100: 0 },
    { id: "w", name: "Whey vanille", kcal100: 380, protein100: 78, fat100: 6, carbs100: 6, fiber100: 0 },
  ];
  it("relie par mots entiers", async () => {
    const { findCustom } = await import("./custom");
    expect(findCustom("skyr nature", customs)?.id).toBe("s");
    expect(findCustom("poudre whey saveur vanille", customs)?.id).toBe("w");
    expect(findCustom("whey chocolat", customs)).toBeUndefined();
  });
});
