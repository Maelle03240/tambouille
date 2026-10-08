/**
 * CONTENU DE LA PAGE « ASTUCES » (aide-mémoire de cuisine).
 * Tout le texte est ici : ajouter une ligne, une section ou corriger une
 * valeur ne demande pas de toucher à l'affichage (src/components/screens/GuideScreen.tsx).
 * Valeurs arrondies, pour cuisiner (pas pour la pâtisserie de précision).
 */

export type OvenSymbol = {
  /** Éléments dessinés dans le pictogramme. */
  draw: { top?: boolean; bottom?: boolean; fan?: boolean; ring?: boolean; grill?: boolean; snow?: boolean };
  name: string;
  use: string;
};

export type GuideBlock =
  | { kind: "table"; title?: string; head: string[]; rows: string[][]; note?: string }
  | { kind: "list"; title?: string; items: [string, string][]; note?: string }
  | { kind: "oven"; symbols: OvenSymbol[]; note?: string }
  /** Calendrier des fruits et légumes (contenu : src/config/seasons.ts). */
  | { kind: "seasons"; note?: string };

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export const KITCHEN_GUIDE: GuideSection[] = [
  {
    id: "saisons",
    title: "Saisons",
    blocks: [{ kind: "seasons", note: "France métropolitaine. Pommes, courges, carottes… se gardent : on les trouve encore après la récolte." }],
  },
  {
    id: "mesures",
    title: "Mesures",
    blocks: [
      {
        kind: "table",
        title: "Contenances",
        head: ["Mesure", "Volume"],
        rows: [
          ["1 cuillère à café", "5 ml"],
          ["1 cuillère à dessert", "10 ml"],
          ["1 cuillère à soupe", "15 ml"],
          ["1 verre à liqueur", "3 cl"],
          ["1 tasse à café", "10 cl"],
          ["1 pot de yaourt", "12,5 cl"],
          ["1 verre à moutarde", "20 cl"],
          ["1 grand verre / mug", "25 cl"],
          ["1 cup (recettes américaines)", "24 cl"],
          ["1 bol", "35 cl"],
        ],
        note: "1 l = 10 dl = 100 cl = 1 000 ml",
      },
      {
        kind: "table",
        title: "Cuillères en grammes (rases)",
        head: ["Ingrédient", "c. à soupe", "c. à café"],
        rows: [
          ["Farine, maïzena", "10 g", "3 g"],
          ["Sucre en poudre", "15 g", "5 g"],
          ["Sel fin", "15 g", "5 g"],
          ["Beurre", "15 g", "5 g"],
          ["Huile", "14 g", "4 g"],
          ["Miel", "20 g", "7 g"],
          ["Cacao en poudre", "8 g", "3 g"],
          ["Levure chimique", "—", "4 g"],
        ],
        note: "Cuillère bombée : compter environ 1,5 fois plus.",
      },
      {
        kind: "table",
        title: "Pots et verres en grammes",
        head: ["Ingrédient", "Pot de yaourt", "Verre à moutarde", "Cup"],
        rows: [
          ["Farine", "70 g", "110 g", "125 g"],
          ["Sucre en poudre", "105 g", "170 g", "200 g"],
          ["Huile", "115 g", "185 g", "220 g"],
          ["Poudre d'amande", "60 g", "95 g", "115 g"],
          ["Beurre", "—", "—", "225 g"],
        ],
      },
      {
        kind: "list",
        title: "Repères",
        items: [
          ["1 œuf moyen", "≈ 50 g sans coquille (blanc 30 g, jaune 20 g)"],
          ["1 noisette de beurre", "≈ 5 g"],
          ["1 noix de beurre", "≈ 15 g"],
          ["1 pincée", "≈ 0,5 g"],
          ["1 sachet de levure chimique", "11 g, pour 500 g de farine"],
          ["1 sachet de sucre vanillé", "7,5 g"],
          ["Levure de boulanger", "1 cube frais (42 g) ≈ 2 sachets secs (2 × 7 g)"],
        ],
      },
      {
        kind: "list",
        title: "Recettes anglo-saxonnes",
        items: [
          ["1 oz (once)", "28 g"],
          ["1 lb (livre)", "454 g"],
          ["1 fl oz", "30 ml"],
          ["1 stick de beurre", "113 g"],
          ["°F → °C", "(°F − 32) × 5 ÷ 9 · 350 °F ≈ 175 °C · 400 °F ≈ 200 °C"],
        ],
      },
    ],
  },
  {
    id: "four",
    title: "Four",
    blocks: [
      {
        kind: "oven",
        symbols: [
          {
            draw: { top: true, bottom: true },
            name: "Convection naturelle (sole + voûte)",
            use: "Le mode classique : gâteaux, pain, soufflés, une seule plaque au milieu. La plupart des recettes françaises sont données pour lui.",
          },
          {
            draw: { fan: true, ring: true },
            name: "Chaleur tournante",
            use: "L'air chaud circule : cuisson homogène, plusieurs plaques à la fois, biscuits, rôtis. Baisser d'environ 20 °C par rapport à la recette.",
          },
          {
            draw: { fan: true, bottom: true },
            name: "Sole + ventilateur (« pizza »)",
            use: "Fond croustillant : pizza, quiche, tarte, pâte feuilletée.",
          },
          {
            draw: { bottom: true },
            name: "Sole seule",
            use: "Chauffe par le dessous : cuire le fond d'une tarte, bain-marie, rattraper un dessous pas assez cuit.",
          },
          {
            draw: { top: true },
            name: "Voûte seule",
            use: "Chauffe par le dessus : dorer en fin de cuisson.",
          },
          {
            draw: { grill: true },
            name: "Gril",
            use: "Gratiner, griller, dorer vite. Plaque en haut, surveiller : ça brûle en 2 minutes.",
          },
          {
            draw: { grill: true, fan: true },
            name: "Gril ventilé (turbo-gril)",
            use: "Viandes et volailles rôties, gratins épais : doré dehors, cuit dedans.",
          },
          {
            draw: { snow: true },
            name: "Décongélation",
            use: "Ventilation sans chauffe (souvent un flocon ou un ventilateur seul) : décongèle doucement.",
          },
        ],
      },
      {
        kind: "table",
        title: "Thermostat",
        head: ["Th.", "°C", "Pour"],
        rows: [
          ["1", "30", "Tiédir"],
          ["2", "60", "Maintenir au chaud"],
          ["3", "90", "Meringues"],
          ["4", "120", "Cuisson très douce"],
          ["5", "150", "Cuisson douce, crèmes"],
          ["6", "180", "Gâteaux, biscuits"],
          ["7", "210", "Tartes, gratins, rôtis"],
          ["8", "240", "Pizza, pain"],
          ["9", "270", "Saisir"],
          ["10", "300", "Gril"],
        ],
        note: "Thermostat × 30 = °C.",
      },
    ],
  },
  {
    id: "cuissons",
    title: "Cuissons",
    blocks: [
      {
        kind: "list",
        title: "Œufs (sortis du frigo, dans l'eau bouillante)",
        items: [
          ["À la coque", "3 min"],
          ["Mollet", "6 min"],
          ["Dur", "9 à 10 min"],
          ["Poché", "3 min dans l'eau frémissante + un filet de vinaigre"],
        ],
        note: "Les passer sous l'eau froide aussitôt pour stopper la cuisson.",
      },
      {
        kind: "list",
        title: "Pâtes et riz",
        items: [
          ["Pâtes", "1 l d'eau + 10 g de gros sel pour 100 g ; temps du paquet − 1 min pour al dente"],
          ["Riz blanc", "1 volume de riz + 1,5 volume d'eau, 12 min à couvert, puis 5 min de repos"],
          ["Riz complet", "1 volume de riz + 2 volumes d'eau, 25 à 30 min"],
          ["Quinoa", "1 volume + 2 volumes d'eau, 12 à 15 min (le rincer avant)"],
        ],
      },
      {
        kind: "table",
        title: "Température à cœur (thermomètre)",
        head: ["Viande", "°C à cœur"],
        rows: [
          ["Bœuf saignant", "50 – 52"],
          ["Bœuf à point", "55 – 58"],
          ["Bœuf bien cuit", "63 et +"],
          ["Agneau rosé", "58 – 60"],
          ["Porc", "63 (juteux) – 70"],
          ["Volaille", "74"],
          ["Viande hachée", "70"],
          ["Poisson", "50 – 55"],
        ],
        note: "Laisser reposer la viande 5 à 10 min sous du papier alu avant de couper.",
      },
    ],
  },
  {
    id: "air-fryer",
    title: "Air fryer",
    blocks: [
      {
        kind: "list",
        title: "Adapter une recette du four",
        items: [
          ["Température", "baisser d'environ 20 °C"],
          ["Temps", "réduire d'environ 20 %, vérifier avant la fin"],
          ["Astuce", "ne pas surcharger le panier, secouer à mi-cuisson"],
        ],
      },
      {
        kind: "table",
        title: "Repères",
        head: ["Aliment", "°C", "Temps"],
        rows: [
          ["Frites fraîches (1 c. à s. d'huile)", "180", "18 – 22 min"],
          ["Frites surgelées", "200", "12 – 15 min"],
          ["Cuisses de poulet", "190", "20 – 25 min"],
          ["Pavé de saumon", "180", "8 – 10 min"],
          ["Légumes rôtis", "190", "12 – 15 min"],
          ["Réchauffer une part de pizza", "170", "3 – 4 min"],
        ],
      },
    ],
  },
  {
    id: "remplacer",
    title: "Remplacer",
    blocks: [
      {
        kind: "list",
        items: [
          ["1 œuf (gâteau)", "50 g de compote, ou ½ banane écrasée, ou 1 c. à s. de graines de lin moulues + 3 c. à s. d'eau (10 min)"],
          ["Babeurre / lait ribot", "25 cl de lait + 1 c. à s. de jus de citron, 10 min"],
          ["Beurre (gâteau)", "huile neutre, environ 80 % du poids du beurre"],
          ["Crème fraîche (sans bouillir)", "yaourt grec ou skyr, plus riche en protéines"],
          ["Sucre vanillé", "1 c. à s. de sucre + ½ c. à c. d'extrait de vanille"],
          ["1 c. à c. de levure chimique", "¼ c. à c. de bicarbonate + ½ c. à c. de jus de citron"],
          ["Épaissir une sauce", "1 c. à s. de maïzena délayée dans un peu d'eau froide pour 25 cl"],
        ],
      },
    ],
  },
];
