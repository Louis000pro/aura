/* ════════════════════════════════════════════════════════════════════
   recapJour — le récap de la veille que le Guide fait en ouvrant l'app.

   Un avantage Vaiiya+ (Louis, 2026-09-25) : à la première ouverture de
   la journée, un POPUP montre les chiffres d'hier (séances, temps,
   séries, calories, repas, EXP) et Nora ou Sasha dit une phrase très
   positive dessus. Une seule fois par jour.

   ── LES RÈGLES QUI NE SE REDISCUTENT PAS ─────────────────────────────
   1. TOUJOURS POSITIF. Il ne parle que de ce qui a été FAIT. Une journée
      vide n'ouvre PAS de popup : une grille de zéros serait un reproche.
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
  seances: { titre: string; minutes: number; series: number }[];
  /** Temps d'entraînement total, en minutes. */
  minutes: number;
  /** Séries faites, toutes séances confondues. */
  series: number;
  /** Calories dépensées à l'entraînement (estimation du tunnel). */
  kcalBrulees: number;
  repas: number;
  /** Calories des repas notés. */
  calories: number;
  /** EXP gagnée hier (registre des missions). */
  exp: number;
  /** Série en cours, jours validés d'affilée. */
  serie: number;
  /** Nom du rang actuel. */
  rang: string;
};

/** Le récap d'un jour : les chiffres, la phrase du Guide, et si le popup
 *  a déjà été montré (il ne s'ouvre qu'une fois par jour). */
export type Recap = { texte: string; faits: FaitsRecap; vu: boolean };

/** Rien d'hier à raconter : pas de popup (des zéros seraient un reproche). */
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
    l.push(`Temps d'entraînement total : ${f.minutes} min${f.kcalBrulees ? `, environ ${f.kcalBrulees} kcal dépensées` : ""}.`);
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

/** La consigne du récap. Les chiffres sont déjà affichés dans le popup :
 *  le Guide ne les recite pas, il FÉLICITE. */
export const CONSIGNE_RECAP = `Tu réagis à la journée d'HIER de cette personne, au moment où elle ouvre l'app ce matin. Ses chiffres (séances, temps d'entraînement, calories dépensées et mangées) sont déjà affichés sous ta phrase : ne les recopie pas, tu peux en citer UN au plus, et seulement parmi ceux-là.
- 1 ou 2 phrases courtes, 30 mots maximum, en tutoyant.
- Ton : très enthousiaste, chaleureux, super positif, comme un coach qui est fier. Exemple de l'énergie attendue : « Ta journée d'hier était incroyable, continue comme ça, tu es sur une super lancée ! »
- Uniquement du positif. Jamais de reproche, jamais « tu n'as pas », jamais ce qui manque.
- N'accorde aucun adjectif ni participe au genre de la personne (pas de « parti/partie », « fier/fière », « motivé/motivée ») : tourne la phrase autrement.
- N'invente rien qui ne soit pas dans les faits.
- Texte brut : pas de markdown, pas de guillemets autour de la réponse, AUCUN emoji.
- Pas de salutation et pas de question.`;

/** Ce qu'on affiche si le modèle ne répond pas. Positif lui aussi. */
export function recapDeRepli(f: FaitsRecap): string {
  if (f.seances.length > 1) return "Deux séances et plus dans la même journée, c'est énorme. Continue comme ça, tu es sur une super lancée.";
  if (f.seances.length === 1) {
    return f.serie > 1
      ? `Ta journée d'hier était vraiment solide, et ta série tient à ${f.serie} jours. Continue comme ça.`
      : "Ta journée d'hier était vraiment solide. Continue comme ça, tu es sur une super lancée.";
  }
  if (f.repas > 0) return "Tu as pris soin de ton assiette hier, c'est comme ça qu'on avance. Continue sur cette lancée.";
  return "Nouvelle journée, tout est ouvert. Continue comme ça.";
}

/** Nettoie ce que rend le modèle : pas de guillemets d'enveloppe, pas de
 *  balises, pas de markdown, et une longueur bornée. */
export function nettoyerRecap(brut: string): string {
  let t = (brut ?? "").replace(/\[[^\]]*\]/g, "").replace(/[*#_`~]/g, "").trim();
  t = t.replace(/^["«“]\s*|\s*["»”]$/g, "").replace(/\s+/g, " ").trim();
  // Aucun emoji dans la phrase (Louis) : le modèle en glisse parfois quand même.
  t = t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+([.!?,])/g, "$1").replace(/\s+/g, " ").trim();
  if (t.length > 240) t = t.slice(0, 240).replace(/\s+\S*$/, "") + "…";
  return t;
}

/** Le récap résumé pour le COACH : quand la personne lui parle de « mon
 *  récap », il sait de quoi il s'agit (chiffres et phrase affichés). */
export function recapPourCoach(r: Recap): string {
  return `${faitsEnTexte(r.faits).split("\n").filter((l) => !l.includes("ne le mentionne PAS")).join("\n")}\nPhrase que tu lui as dite ce matin dans le récap : « ${r.texte} »`;
}

/* ── Le cache, côté navigateur ────────────────────────────────────── */

/* « v2 » : les séries ont quitté le récap (Louis, 2026-09-25). Changer le
   préfixe fait regénérer une fois la phrase gardée, qui pouvait encore les
   citer ; l'ancienne clé est nettoyée par `noterRecap`. */
const PREFIXE = "vaiiya_recap2_";
const cle = (userId: string, jour: string) => `${PREFIXE}${userId}_${jour}`;

export function lireRecap(userId: string, jour: string): Recap | null {
  try {
    const brut = localStorage.getItem(cle(userId, jour));
    if (!brut) return null;
    const r = JSON.parse(brut) as Recap;
    return r && typeof r.texte === "string" && r.faits ? r : null;
  } catch {
    return null; // ancien format (texte seul) ou stockage refusé : on regénère
  }
}

export function noterRecap(userId: string, jour: string, recap: Recap) {
  try {
    // Un seul récap gardé par compte : on nettoie ceux des jours d'avant.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(`${PREFIXE}${userId}_`) || k.startsWith(`vaiiya_recap_${userId}_`)) && k !== cle(userId, jour)) localStorage.removeItem(k);
    }
    localStorage.setItem(cle(userId, jour), JSON.stringify(recap));
  } catch {
    /* Stockage refusé : le récap sera regénéré à la prochaine ouverture. */
  }
}

/** Le récap de CE jour pour ce compte, s'il a été généré. Sert au coach :
 *  il doit connaître le récap que la personne a vu ce matin, et jamais un
 *  récap d'il y a trois jours présenté comme celui d'hier. */
export function recapDuJour(userId: string, jour: string): Recap | null {
  return lireRecap(userId, jour);
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
