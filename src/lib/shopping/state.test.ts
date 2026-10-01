import { describe, expect, it } from "vitest";
import { EMPTY_SHOPPING, applyShoppingOps, diffShopping, shoppingFromRows, type ShoppingState } from "./state";

const base: ShoppingState = {
  ...EMPTY_SHOPPING,
  extras: [{ recipeId: "cake", servings: 8 }],
  checked: ["farine|g"],
  mine: [{ id: "p1", text: "Dentifrice", aisle: "Maison & hygiène" }],
};

describe("liste de courses du foyer : opérations", () => {
  it("cocher / décocher", () => {
    const after = { ...base, checked: ["sucre|g"] };
    expect(diffShopping(base, after)).toEqual([
      { kind: "check", key: "sucre|g", on: true },
      { kind: "check", key: "farine|g", on: false },
    ]);
  });

  it("recette : ajout, retrait du menu, portions, et retour à rien", () => {
    const after = { ...base, excluded: ["curry"], servings: { cake: 12 } };
    expect(diffShopping(base, after)).toEqual([
      { kind: "recipe", recipeId: "cake", row: { recipeId: "cake", extra: true, extraServings: 8, excluded: false, servings: 12 } },
      { kind: "recipe", recipeId: "curry", row: { recipeId: "curry", extra: false, extraServings: null, excluded: true, servings: null } },
    ]);
    expect(diffShopping(base, { ...base, extras: [] })).toEqual([{ kind: "recipe", recipeId: "cake", row: null }]);
  });

  it("articles ajoutés à la main", () => {
    const moved = { ...base, mine: [{ id: "p1", text: "Dentifrice", aisle: "Autre" }, { id: "p2", text: "Éponge", aisle: "Maison & hygiène" }] };
    expect(diffShopping(base, moved).map((o) => o.kind + (o.kind === "item" ? o.id : ""))).toEqual(["itemp1", "itemp2"]);
    expect(diffShopping(base, { ...base, mine: [] })).toEqual([{ kind: "item", id: "p1", item: null }]);
  });

  it("aller-retour : état → opérations → état identique", () => {
    const after: ShoppingState = {
      extras: [{ recipeId: "tarte", servings: 6 }],
      servings: { curry: 2 },
      excluded: ["gratin"],
      checked: ["oignons|-", "sel|-"],
      mine: [{ id: "p9", text: "Papier toilette", aisle: "Maison & hygiène" }],
    };
    const replayed = applyShoppingOps(EMPTY_SHOPPING, diffShopping(EMPTY_SHOPPING, after));
    expect(replayed).toEqual(after);
    const rows = diffShopping(EMPTY_SHOPPING, after).flatMap((o) => (o.kind === "recipe" && o.row ? [o.row] : []));
    expect(shoppingFromRows(rows, after.checked, after.mine)).toEqual(after);
  });
});
