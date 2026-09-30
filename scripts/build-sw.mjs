/**
 * Génère public/sw.js à partir de scripts/sw.template.js.
 * Lancé automatiquement avant `npm run build` (script "prebuild").
 * Ajouter une page à l'appli = l'ajouter à ROUTES pour qu'elle marche hors ligne.
 */
import { readFileSync, writeFileSync } from "node:fs";

const ROUTES = ["/", "/recette", "/cuisine", "/ajouter", "/modifier", "/a-revoir", "/reglages", "/astuces"];

const version = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8) || Date.now().toString(36);
const template = readFileSync(new URL("./sw.template.js", import.meta.url), "utf8");
const out = template.replace("__VERSION__", version).replace("__ROUTES__", JSON.stringify(ROUTES));
writeFileSync(new URL("../public/sw.js", import.meta.url), out);
console.log(`sw.js généré (version ${version})`);
