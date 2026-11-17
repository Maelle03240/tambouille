/** Nom et textes de marque. Changer ici suffit (manifest, titres, en-têtes). */
export const BRAND = {
  name: "Le carnet de Tambouille",
  shortName: "Tambouille",
  tagline: "recettes de famille & petits plats",
  /** Couleur de la barre d'état / de l'écran de lancement (fond crème du thème). */
  themeColor: "#f5ead8",
  /** Prénom de l'admin, affiché sur « Mot de passe oublié ? » (c'est elle qui donne les liens). */
  adminName: "Maëllita",
  /**
   * Durée de validité d'un lien d'invitation / de mot de passe, annoncée dans
   * le message. Doit correspondre à « Email OTP Expiration » dans les réglages
   * Auth de Supabase (24 h au maximum, soit 86400 s).
   */
  linkValidHours: 24,
} as const;
