/**
 * Moments de repas : À QUEL MOMENT on mange la recette (plusieurs possibles),
 * à distinguer de la catégorie = QUEL TYPE de plat.
 * Un brownie = catégorie « dessert » + moment « goûter ».
 * Serviront aussi au planning de la V2 (un tirage par moment de la journée).
 * Ajouter un moment = une ligne ici. Ne pas renommer un `id` stocké.
 */
export const MOMENTS = [
  { id: "petit-dejeuner", label: "Petit-déj" },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "gouter", label: "Goûter" },
  { id: "diner", label: "Dîner" },
] as const;

export type MomentId = (typeof MOMENTS)[number]["id"];

export const MOMENT_IDS = MOMENTS.map((m) => m.id) as [MomentId, ...MomentId[]];

export function momentLabel(id: string) {
  return MOMENTS.find((m) => m.id === id)?.label ?? id;
}
