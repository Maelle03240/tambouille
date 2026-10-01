/** Adresse d'affichage d'une image de recette (Supabase Storage, ou data URL en mode local). */
export function imageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("data:")) return imagePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/recipe-images/${imagePath}` : null;
}
