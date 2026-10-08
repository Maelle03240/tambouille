import { describe, expect, it } from "vitest";
import { addSection, fromRows, moveRow, removeSection, renameSection, toRows } from "./sections";

const it_ = (id: string, section: string | null) => ({ id, section });
const ids = (xs: { id: string; section: string | null }[]) => xs.map((x) => `${x.id}:${x.section ?? "-"}`).join(" ");

describe("parties", () => {
  const items = [it_("a", null), it_("b", "Biscuit"), it_("c", "Biscuit"), it_("d", "Crème")];

  it("lignes avec titres", () => {
    expect(toRows(items).map((r) => (r.kind === "section" ? `#${r.name}` : r.item.id))).toEqual(["a", "#Biscuit", "b", "c", "#Crème", "d"]);
    expect(fromRows(toRows(items))).toEqual(items);
  });

  it("glisser sous un autre titre change la partie", () => {
    // d (ligne 5) monte au-dessus du titre Crème (ligne 4) → rejoint Biscuit
    expect(ids(moveRow(items, 5, 4))).toBe("a:- b:Biscuit c:Biscuit d:Biscuit");
    // b (ligne 2) monte au-dessus du titre Biscuit → sans partie
    expect(ids(moveRow(items, 2, 1))).toBe("a:- b:- c:Biscuit d:Crème");
  });

  it("renommer et retirer", () => {
    expect(ids(renameSection(items, "b", "Pâte"))).toBe("a:- b:Pâte c:Pâte d:Crème");
    expect(ids(removeSection(items, "d"))).toBe("a:- b:Biscuit c:Biscuit d:Biscuit");
    expect(ids(removeSection([it_("x", "P"), it_("y", "P")], "x"))).toBe("x:- y:-");
  });

  it("ajouter une partie", () => {
    const first = addSection([it_("a", null), it_("b", null)], (s) => it_("n", s));
    expect(ids(first.items)).toBe("a: b:");
    const next = addSection(items, (s) => it_("n", s));
    expect(ids(next.items)).toBe("a:- b:Biscuit c:Biscuit d:Crème n:");
    expect(next.focusId).toBe("sec:n");
  });
});
