/** Idées déjà réalisées : une recette enregistrée dont le titre contient l'idée. Pure, testée. */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function ideasDoneBy<T extends { text: string }>(ideas: T[], title: string): T[] {
  const t = fold(title);
  return ideas.filter((i) => {
    const idea = fold(i.text);
    return !!idea && t.includes(idea);
  });
}
