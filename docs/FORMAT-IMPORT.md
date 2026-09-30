# Format d'import d'une recette (JSON)

C'est le format que renvoie l'IA après lecture d'une photo / capture / texte, et celui qu'on peut coller dans **Ajouter → Coller du JSON** (par exemple une recette mise en forme dans une conversation Claude : le bouton « Copier les consignes pour Claude » donne tout ce qu'il faut).

Définition exacte et validation : `src/lib/recipes/import-format.ts`. Exemple complet : `src/lib/recipes/samples.ts`.

```json
{
  "title": "Tarte tatin de Mamie",
  "category": "dessert",
  "moments": ["gouter"],
  "yield_quantity": 6,
  "yield_unit": "personnes",
  "portion_size": 1,
  "prep_minutes": 20,
  "cook_minutes": 35,
  "ingredients": [
    { "section": null, "text": "1,5 kg de pommes reinettes", "quantity": 1.5, "unit": "kg", "name": "pommes reinettes",
      "grams_estimate": 1500, "aisle": "Fruits & légumes", "scalable": true },
    { "section": null, "text": "Sel au goût", "quantity": null, "unit": "", "name": "sel", "scalable": false }
  ],
  "steps": [
    "Épluchez {pommes reinettes} et coupez-les en quartiers.",
    "Faites un caramel blond {8 min}, puis enfournez {35 min}."
  ],
  "nutrition_per_portion": { "kcal": 320, "protein_g": 3, "fat_g": 14, "carbs_g": 48, "fiber_g": 3 },
  "has_vegetables": false,
  "protein_source": "laitier",
  "total_weight_g": 1400,
  "tags": [],
  "uncertain": [
    { "field": "ingredients.0", "question": "Mal lu : 1,5 kg ou 1 kg ?", "options": ["1,5 kg de pommes reinettes", "1 kg de pommes reinettes"] }
  ]
}
```

- **category** (type de plat) : `entree`, `plat`, `dessert`, `sauce`, `apero`, `cocktail`, `pain` (liste : `src/config/categories.ts`).
- **moments** (quand on le mange, plusieurs possibles) : `petit-dejeuner`, `dejeuner`, `gouter`, `diner` (liste : `src/config/moments.ts`).
- **ingredients** : `text` suffit (« 200 g de farine » est lu tout seul) ; `quantity` / `unit` / `name` le précisent. `section` = groupe facultatif.
- **steps** : `{nom exact de l'ingrédient}` affiche sa quantité (recalculée selon les portions) ; `{8 min}`, `{1 h 30}` crée un minuteur. Deux ingrédients de même nom : `{huile d'olive#2}` pour le second.
- **nutrition_per_portion** : valeurs **par portion**, estimées.
- **uncertain** : points à vérifier sur l'écran de vérification (`field` = `ingredients.<n>`, `steps.<n>` ou un champ comme `prep_minutes`, index depuis 0).
- Tout champ absent vaut « non renseigné » ; il apparaîtra dans « À revoir » si c'est une info importante (temps, kcal…).
