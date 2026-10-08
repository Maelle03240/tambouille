/**
 * CALENDRIER DES SAISONS (page Astuces) — fruits et légumes de France
 * métropolitaine, mois de récolte en pleine terre (1 = janvier).
 * Ajouter un produit = une ligne. Les produits de conservation (pommes,
 * courges, carottes…) incluent les mois où on les trouve encore stockés.
 */

export type SeasonKind = "legume" | "fruit";

/** Mois de `from` à `to` compris, en passant par décembre si besoin (10 → 3). */
const months = (from: number, to: number) => {
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to) return out;
  }
};
const ALL = months(1, 12);

export const SEASONAL: { name: string; kind: SeasonKind; months: number[] }[] = [
  // Légumes
  { name: "Ail", kind: "legume", months: months(6, 9) },
  { name: "Artichaut", kind: "legume", months: months(5, 9) },
  { name: "Asperge", kind: "legume", months: months(4, 6) },
  { name: "Aubergine", kind: "legume", months: months(6, 9) },
  { name: "Betterave", kind: "legume", months: months(7, 3) },
  { name: "Blette", kind: "legume", months: months(6, 10) },
  { name: "Brocoli", kind: "legume", months: months(6, 11) },
  { name: "Carotte", kind: "legume", months: ALL },
  { name: "Céleri-branche", kind: "legume", months: months(6, 11) },
  { name: "Céleri-rave", kind: "legume", months: months(9, 3) },
  { name: "Champignon de Paris", kind: "legume", months: ALL },
  { name: "Chou blanc, chou vert", kind: "legume", months: months(10, 3) },
  { name: "Chou de Bruxelles", kind: "legume", months: months(10, 2) },
  { name: "Chou-fleur", kind: "legume", months: months(9, 4) },
  { name: "Chou rouge", kind: "legume", months: months(9, 3) },
  { name: "Concombre", kind: "legume", months: months(5, 9) },
  { name: "Courge, potiron, butternut", kind: "legume", months: months(9, 2) },
  { name: "Courgette", kind: "legume", months: months(6, 9) },
  { name: "Endive", kind: "legume", months: months(10, 4) },
  { name: "Épinard", kind: "legume", months: [3, 4, 5, 6, 9, 10, 11] },
  { name: "Fenouil", kind: "legume", months: months(6, 10) },
  { name: "Fève", kind: "legume", months: months(5, 7) },
  { name: "Haricot vert", kind: "legume", months: months(6, 9) },
  { name: "Laitue, salade", kind: "legume", months: months(4, 10) },
  { name: "Mâche", kind: "legume", months: months(10, 3) },
  { name: "Maïs", kind: "legume", months: months(8, 9) },
  { name: "Navet", kind: "legume", months: months(10, 4) },
  { name: "Oignon", kind: "legume", months: ALL },
  { name: "Panais", kind: "legume", months: months(10, 3) },
  { name: "Petits pois", kind: "legume", months: months(5, 7) },
  { name: "Poireau", kind: "legume", months: months(9, 4) },
  { name: "Poivron", kind: "legume", months: months(7, 10) },
  { name: "Pomme de terre", kind: "legume", months: ALL },
  { name: "Radis", kind: "legume", months: months(3, 9) },
  { name: "Tomate", kind: "legume", months: months(6, 10) },
  { name: "Topinambour", kind: "legume", months: months(10, 3) },
  // Fruits
  { name: "Abricot", kind: "fruit", months: months(6, 8) },
  { name: "Cassis", kind: "fruit", months: [7] },
  { name: "Cerise", kind: "fruit", months: months(5, 7) },
  { name: "Châtaigne", kind: "fruit", months: months(10, 12) },
  { name: "Clémentine", kind: "fruit", months: months(11, 2) },
  { name: "Coing", kind: "fruit", months: months(10, 11) },
  { name: "Figue", kind: "fruit", months: months(8, 10) },
  { name: "Fraise", kind: "fruit", months: months(4, 7) },
  { name: "Framboise", kind: "fruit", months: months(6, 9) },
  { name: "Groseille", kind: "fruit", months: months(6, 8) },
  { name: "Kiwi", kind: "fruit", months: months(11, 4) },
  { name: "Melon", kind: "fruit", months: months(6, 9) },
  { name: "Mirabelle", kind: "fruit", months: months(8, 9) },
  { name: "Mûre", kind: "fruit", months: months(8, 9) },
  { name: "Myrtille", kind: "fruit", months: months(7, 9) },
  { name: "Noix", kind: "fruit", months: months(9, 12) },
  { name: "Orange", kind: "fruit", months: months(12, 3) },
  { name: "Pastèque", kind: "fruit", months: months(7, 8) },
  { name: "Pêche, nectarine", kind: "fruit", months: months(6, 9) },
  { name: "Poire", kind: "fruit", months: months(8, 1) },
  { name: "Pomme", kind: "fruit", months: months(8, 4) },
  { name: "Prune", kind: "fruit", months: months(7, 9) },
  { name: "Raisin", kind: "fruit", months: months(8, 10) },
  { name: "Rhubarbe", kind: "fruit", months: months(4, 7) },
];

export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
