import { describe, expect, it } from "vitest";
import { chooseGeminiKey } from "./tier";

describe("clé Gemini", () => {
  it("payante : admin, interrupteur activé, clé présente", () => expect(chooseGeminiKey({ role: "admin", aiPaid: true }, "payante")).toBe("payante"));
  it("gratuite si l'interrupteur est coupé", () => expect(chooseGeminiKey({ role: "admin", aiPaid: false }, "payante")).toBeUndefined());
  it("gratuite pour un membre, même s'il a activé le champ", () => expect(chooseGeminiKey({ role: "editor", aiPaid: true }, "payante")).toBeUndefined());
  it("gratuite si la clé payante n'existe pas", () => expect(chooseGeminiKey({ role: "admin", aiPaid: true }, undefined)).toBeUndefined());
});
