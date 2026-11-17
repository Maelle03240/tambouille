import { describe, expect, it } from "vitest";
import { ideasDoneBy } from "./ideas";

describe("idées réalisées", () => {
  const ideas = [{ text: "Lasagnes" }, { text: "Tarte aux pommes" }];
  it("retrouve l'idée dans le titre, sans tenir compte des accents", () => {
    expect(ideasDoneBy(ideas, "LASAGNES de mamie")).toEqual([ideas[0]]);
    expect(ideasDoneBy([{ text: "Gâteau" }], "gateau nantais")).toHaveLength(1);
  });
  it("laisse les autres", () => expect(ideasDoneBy(ideas, "Tarte au citron")).toEqual([]));
});
