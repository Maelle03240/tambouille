/**
 * Que deviennent les recettes perso d'un compte supprimé ? Pure, testée.
 * (Ce que l'admin a déjà accepté est dans la bibliothèque : rien ne change.)
 * - proposition en attente : elle reste, l'admin décide ;
 * - refusée : elle part, sauf une création s'il reste quelqu'un dans son foyer
 *   (la recette passe à cette personne pour rester visible du foyer) ;
 * - version refusée d'une recette de la bibliothèque : elle part toujours,
 *   l'originale reste (donnée à un autre membre, elle remplacerait l'originale chez lui).
 */
export type DeletedRecipeFate = "keep" | "give" | "remove";

export function fateOfRecipe(r: { proposalStatus: string | null; forkedFromId: string | null }, hasHousemate: boolean): DeletedRecipeFate {
  const refused = r.proposalStatus !== "pending";
  if (r.forkedFromId) return refused ? "remove" : "keep";
  if (hasHousemate) return "give";
  return refused ? "remove" : "keep";
}
