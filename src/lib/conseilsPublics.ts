/* ════════════════════════════════════════════════════════════════════
   LES MINI-COURS D'ENTRAÎNEMENT, CÔTÉ PUBLIC (« Conseils & progresser »
   dans l'application).

   Le texte vit dans `lib/adviceArticles.ts`. L'adresse publique est son
   identifiant sans le préfixe « conseil- » : l'identifiant est figé pour
   toujours, donc l'adresse l'est aussi.

   ⚠️ Vaiiya+ en aperçu, comme les cours de nutrition : l'introduction et
   les titres des parties, sans la suite.
   ════════════════════════════════════════════════════════════════════ */
import { ADVICE_ARTICLES, ADVICE_THEMES, type AdviceArticle, type AdviceTheme } from "./adviceArticles";

export const slugConseil = (a: AdviceArticle) => a.id.replace(/^conseil-/, "");

export function conseilsPublies(): AdviceArticle[] {
  return ADVICE_ARTICLES;
}

export function conseilParSlug(slug: string): AdviceArticle | null {
  return ADVICE_ARTICLES.find((a) => slugConseil(a) === slug) ?? null;
}

export function conseilsParTheme(): { theme: AdviceTheme; articles: AdviceArticle[] }[] {
  return ADVICE_THEMES.map((theme) => ({ theme, articles: ADVICE_ARTICLES.filter((a) => a.theme === theme) })).filter(
    (g) => g.articles.length > 0,
  );
}

export function verifierConseils(): string[] {
  const soucis: string[] = [];
  const vus = new Set<string>();
  for (const a of ADVICE_ARTICLES) {
    const s = slugConseil(a);
    if (vus.has(s)) soucis.push(`adresse en double : « ${s} »`);
    vus.add(s);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) soucis.push(`adresse mal formée : « ${s} »`);
  }
  return soucis;
}
