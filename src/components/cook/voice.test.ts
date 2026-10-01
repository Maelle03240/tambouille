import { describe, expect, it } from "vitest";
import { parseVoiceCommand } from "./useVoiceCommands";

describe("commandes vocales", () => {
  it.each([
    ["Suivant", { kind: "next" }],
    ["c'est fait", { kind: "next" }],
    ["étape précédente", { kind: "previous" }],
    ["minuteur 10 minutes", { kind: "timer", minutes: 10 }],
    ["minuteur cinq minutes", { kind: "timer", minutes: 5 }],
    ["mets un minuteur de 1 heure", { kind: "timer", minutes: 60 }],
    ["minuteur 30 secondes", { kind: "timer", minutes: 0.5 }],
    ["lance le minuteur", { kind: "timer", minutes: null }],
    ["stop", { kind: "stop" }],
    ["pause", { kind: "pause" }],
    ["mets en pause", { kind: "pause" }],
    ["reprends", { kind: "resume" }],
    ["il fait beau", null],
  ])("%s", (heard, expected) => expect(parseVoiceCommand(heard)).toEqual(expected));
});
