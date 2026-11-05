import { describe, expect, it } from "vitest";
import { fateOfRecipe } from "./deleted-account";

describe("recettes d'un compte supprimé", () => {
  it("création refusée : reste dans le foyer s'il y a quelqu'un, sinon part", () => {
    expect(fateOfRecipe({ proposalStatus: "refused", forkedFromId: null }, true)).toBe("give");
    expect(fateOfRecipe({ proposalStatus: "refused", forkedFromId: null }, false)).toBe("remove");
  });
  it("création en attente : reste, et toujours visible du foyer s'il y a quelqu'un", () => {
    expect(fateOfRecipe({ proposalStatus: "pending", forkedFromId: null }, true)).toBe("give");
    expect(fateOfRecipe({ proposalStatus: "pending", forkedFromId: null }, false)).toBe("keep");
  });
  it("version d'une recette de la bibliothèque : en attente reste, refusée part", () => {
    expect(fateOfRecipe({ proposalStatus: "pending", forkedFromId: "x" }, true)).toBe("keep");
    expect(fateOfRecipe({ proposalStatus: "refused", forkedFromId: "x" }, true)).toBe("remove");
  });
});
