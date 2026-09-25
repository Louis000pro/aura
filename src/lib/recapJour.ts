/* ════════════════════════════════════════════════════════════════════
   recapJour — le récap de la veille que le Guide fait en ouvrant l'app.

   Un avantage Vaiiya+ (Louis, 2026-09-25) : à la première ouverture de
   la journée, Nora ou Sasha raconte hier en deux ou trois phrases, à la
   place de la phrase d'accueil habituelle. UN SEUL Guide qui parle sur
   l'écran, jamais deux.

   ── LES RÈGLES QUI NE SE REDISCUTENT PAS ─────────────────────────────
   1. TOUJOURS POSITIF. Il ne parle que de ce qui a été FAIT. Une journée
      vide ne devient jamais « tu n'as rien fait hier » : il parle de ce
      qui tient toujours (la série, le rang) et donne envie d'aujourd'hui.
   2. RIEN D'INVENTÉ. Le modèle ne reçoit que des faits lus en base, et il
      n'a le droit d'écrire que ceux-là. Pas de chiffre qui n'est pas
      dans la liste.
   3. UNE GÉNÉRATION PAR JOUR. Le texte est gardé sur l'appareil, donc
      revenir sur l'accueil ne rappelle pas l'IA, et il ne consomme pas
      les messages au coach (catégorie `recap`, pas `chat`).

   La décision et la phrase de repli sont PURES (aucune requête), le cache
   est côté navigateur, et la lecture des faits vit dans la route
   `/api/assistant/recap`.
   ════════════════════════════════════════════════════════════════════ */

/** Ce que le Guide sait d'hier. Lu en base par la route, jamais inventé. */
export type FaitsRecap = {
  seances: { titre: string; minutes: number }[];
  repas: number;
  calories: number;
  /** EXP gagnée hier (registre des missions). */
  exp: number;
  /** Série en cours, jours validés d'affilée. */
  serie: number;
  /** Nom du rang actuel. */
  rang: string;
};

/** Rien d'hier à raconter. Le récap parle alors de ce qui tient. */
export function journeeVide(f: FaitsRecap): boolean {
  return f.seances.length === 0 && f.repas === 0;
}

/** Les faits, écrits pour le modèle. Une ligne par fait, rien d'autre. */
export function faitsEnTexte(f: FaitsRecap): string {
  const l: string[] = [];
  if (f.seances.length) {
    l.push(
      "Séances terminées hier : " +
        f.seances.map((s) => `« ${s.titre} » (${s.minutes} min)`).join(", ") + ".",
    );
  } else {
    l.push("Aucune séance hier (ne le mentionne PAS).");
  }
  if (f.repas) l.push(`Repas notés hier : ${f.repas}${f.calories ? `, environ ${f.calories} kcal au total` : ""}.`);
  else l.push("Aucun repas noté hier (ne le mentionne PAS).");
  if (f.exp > 0) l.push(`EXP gagnée hier : ${f.exp}.`);
  if (f.serie > 0) l.push(`Série en cours : ${f.serie} jour${f.serie > 1 ? "s" : ""} validé${f.serie > 1 ? "s" : ""} d'affilée.`);
  if (f.rang) l.push(`Rang actuel : ${f.rang}.`);
  return l.join("\n");
}

/** La consigne du récap. Courte exprès : le modèle n'a qu'une chose à faire. */
export const CONSIGNE_RECAP = `Tu fais le récap de la journée d'HIER de cette personne, au moment où elle ouvre l'app ce matin.
- 2 ou 3 phrases courtes, 45 mots maximum, en tutoyant.
- Uniquement du positif. Tu ne parles QUE de ce qui a été fait. Jamais de reproche, jamais « tu n'as pas », jamais ce qui manque, jamais d'objectif raté.
- Si hier est vide, tu ne le dis pas : tu parles de ce qui tient (la série, le rang) et tu donnes envie d'aujourd'hui, sans pression.
- Tu n'utilises que les faits donnés. N'invente aucun chiffre, aucune séance, aucun repas.
- Texte brut : pas de markdown, pas de liste, pas de guillemets autour de la réponse, au plus un emoji.
- Pas de salutation (« Bonjour » est déjà affiché) et pas de question.`;

/** Ce qu'on affiche si le modèle ne répond pas. Positif lui aussi. */
export function recapDeRepli(f: FaitsRecap): string {
  const s = f.seances;
  if (s.length === 1) {
    return `Hier tu as bouclé « ${s[0].titre} » en ${s[0].minutes} minutes.` +
      (f.serie > 1 ? ` Ta série tient à ${f.serie} jours, belle régularité.` : " Belle séance, on continue sur cette lancée.");
  }
  if (s.length > 1) {
    return `Hier tu as enchaîné ${s.length} séances.` +
      (f.serie > 1 ? ` Ta série tient à ${f.serie} jours.` : " Grosse journée, bravo.");
  }
  if (f.repas > 0) {
    return `Hier tu as noté ${f.repas} repas, c'est comme ça qu'on avance.` +
      (f.serie > 1 ? ` Ta série tient à ${f.serie} jours.` : "");
  }
  if (f.serie > 1) return `Ta série tient à ${f.serie} jours. Aujourd'hui est une belle occasion de la prolonger.`;
  return `Nouvelle journée, tout est ouvert. Rang ${f.rang || "Bronze"}, et la suite ne demande qu'un premier geste.`;
}

/** Nettoie ce que rend le modèle : pas de guillemets d'enveloppe, pas de
 *  balises, pas de markdown, et une longueur bornée. */
export function nettoyerRecap(brut: string): string {
  let t = (brut ?? "").replace(/\[[^\]]*\]/g, "").replace(/[*#_`~]/g, "").trim();
  t = t.replace(/^["«“]\s*|\s*["»”]$/g, "").replace(/\s+/g, " ").trim();
  if (t.length > 320) t = t.slice(0, 320).replace(/\s+\S*$/, "") + "…";
  return t;
}

/* ── Le cache, côté navigateur ────────────────────────────────────── */

const cle = (userId: string, jour: string) => `vaiiya_recap_${userId}_${jour}`;

export function lireRecap(userId: string, jour: string): string | null {
  try {
    return localStorage.getItem(cle(userId, jour));
  } catch {
    return null;
  }
}

export function noterRecap(userId: string, jour: string, texte: string) {
  try {
    // Un seul récap gardé par compte : on nettoie ceux des jours d'avant.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`vaiiya_recap_${userId}_`) && k !== cle(userId, jour)) localStorage.removeItem(k);
    }
    localStorage.setItem(cle(userId, jour), texte);
  } catch {
    /* Stockage refusé : le récap sera regénéré à la prochaine ouverture. */
  }
}

/** Les bornes d'HIER dans le fuseau de l'appareil : la date locale (pour
 *  `nutrition_logs.date`) et l'intervalle ISO (pour `started_at`). */
export function bornesHier(maintenant = new Date()) {
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    jour: `${debut.getFullYear()}-${p(debut.getMonth() + 1)}-${p(debut.getDate())}`,
    debut: debut.toISOString(),
    fin: fin.toISOString(),
  };
}
