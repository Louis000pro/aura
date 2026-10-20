/* ════════════════════════════════════════════════════════════════════
   L'OUVERTURE DE LA CONVERSATION (Louis, 2026-10-20, version 3 de la
   maquette « La conversation du Guide »).

   Quand on ouvre la conversation, le Guide parle en PREMIER, et de ta
   journée : une séance en pause, la séance du jour, la prochaine étape,
   ce qui est fait, le repos, la flamme. Avant, il disait « Salut » et
   « Dis-moi où tu en es » à tout le monde, tous les jours, avec les
   quatre mêmes suggestions : c'était la page blanche de tous les
   assistants.

   Ce module décide CE QU'IL DIT et CE QUE TU PEUX RÉPONDRE. `guides.ts`
   écrit les phrases ; la feuille les montre.

   ⚠️ L'OUVERTURE NE COÛTE AUCUN APPEL D'IA. Tout vient de ce que l'app a
   déjà lu (la reprise, la journée, la série), et les phrases sont
   écrites d'avance. Le coach ne prend la main qu'à ta réponse, et il
   reçoit alors l'ouverture avec elle, pour savoir à quoi tu réponds.

   ⚠️ RIEN N'EST ÉCRIT TANT QUE TU N'AS PAS RÉPONDU. L'ouverture se
   recompose à chaque fois que la conversation s'ouvre vide : une séance
   terminée entre deux ouvertures change ce que dit le Guide.

   ⚠️ PUR : aucune lecture, aucune horloge (l'heure est un argument),
   aucun DOM. `check:ouverture` le vérifie hors ligne.
   ════════════════════════════════════════════════════════════════════ */

import { voix, type GuideRef } from "./guides";
import { etatFlamme } from "./flammesSerie";
import type { EtatJournee } from "./journee";

/** Ce dont parle l'ouverture. */
export type SituationOuverture =
  /** Une séance en pause sur cet appareil. */
  | { genre: "reprise"; titre: string; position: number | null; total: number | null }
  /** Une séance à faire aujourd'hui (datée, ou la prochaine étape prévue aujourd'hui). */
  | { genre: "seance"; titre: string; minutes: number | null }
  /** La prochaine étape du cycle, pour un autre jour ou « quand tu veux ». */
  | { genre: "etape"; titre: string; quand: string | null; minutes: number | null }
  /** La séance du jour est faite. */
  | { genre: "faite"; titre: string | null }
  /** Un repos posé. */
  | { genre: "repos" }
  /** Rien de prévu, et ce n'est pas un repos. */
  | { genre: "libre" }
  /** Rien à dire de précis (questionnaire pas rempli, lecture ratée…). */
  | { genre: "aucune" };

/** Ce qu'une réponse fait tout de suite, sur cet appareil, sans rien
 *  envoyer au coach. */
export type ActionOuverture = "reprendre" | "lancer";

/** Une réponse déjà écrite, de ton côté. Avec `action`, elle agit ; sans,
 *  elle part au coach telle quelle, comme si tu l'avais tapée. Ce sont
 *  TES mots : ils vivent ici et pas dans `guides.ts`. */
export type BrouillonOuverture = { texte: string; action?: ActionOuverture };

export type Ouverture = {
  situation: SituationOuverture["genre"];
  /** Les bulles du Guide, dans l'ordre. */
  bulles: string[];
  brouillons: BrouillonOuverture[];
};

/** Ce que l'app sait au moment où la conversation s'ouvre. */
export type FaitsOuverture = {
  /** La séance en pause (`useWorkoutLaunch().reprise`), ramenée à ce qu'on en dit. */
  reprise: { titre: string; exerciceIdx: number; total: number } | null;
  /** L'état du héros (`useJournee().etat`). */
  etat: EtatJournee;
  /** Le titre de l'intention principale du jour, s'il y en a une. */
  titreJour: string | null;
  /** Le nom de la prochaine étape du cycle. */
  etape: string | null;
  /** Le jour de cette étape, dit à voix haute : « demain », « mardi 8 »
   *  (`prevuLe ?? reserveLe`, la même priorité que le héros). */
  quand: string | null;
  /** L'estimation de ce que le bouton principal lancerait, en minutes. */
  minutes: number | null;
};

const AUJOURDHUI = /^aujourd['’]hui$/i;

/**
 * La situation, dans l'ordre où on la cherche. `null` = on ne sait pas
 * encore (la journée n'est pas lue) : on ne dit rien plutôt que « rien de
 * prévu ».
 *
 * ⚠️ LA SÉANCE EN PAUSE PASSE AVANT TOUT, comme sur l'accueil : c'est le
 * seul travail commencé, et il se perd au bout de sept jours.
 * ⚠️ « LIBRE » N'EST JAMAIS « REPOS ». Un repos se pose ; une journée sans
 * rien n'en est pas un, et le dire serait affirmer un choix que personne
 * n'a fait (V5).
 */
export function situationDuJour(f: FaitsOuverture): SituationOuverture | null {
  if (f.reprise && f.reprise.titre.trim()) {
    const total = f.reprise.total > 0 ? f.reprise.total : null;
    const position = total ? Math.min(Math.max(1, f.reprise.exerciceIdx + 1), total) : null;
    return { genre: "reprise", titre: f.reprise.titre.trim(), position, total };
  }
  switch (f.etat) {
    case "loading":
      return null;
    case "seance":
      return f.titreJour ? { genre: "seance", titre: f.titreJour, minutes: f.minutes } : { genre: "aucune" };
    case "etape":
      if (!f.etape) return { genre: "aucune" };
      /* Une étape prévue AUJOURD'HUI est la séance du jour : on la dit
         comme telle, sinon « prévue aujourd'hui » se lit comme un rappel
         d'agenda au lieu d'une proposition. */
      return f.quand && AUJOURDHUI.test(f.quand.trim())
        ? { genre: "seance", titre: f.etape, minutes: f.minutes }
        : { genre: "etape", titre: f.etape, quand: f.quand, minutes: f.minutes };
    case "done":
      return { genre: "faite", titre: f.titreJour };
    case "repos":
      return { genre: "repos" };
    case "libre":
      return { genre: "libre" };
    default:
      return { genre: "aucune" };
  }
}

/** Le soir commence à 18 h et finit à 5 h. */
export const estSoir = (heure: number) => heure >= 18 || heure < 5;

/** « Je mange quoi ce midi ? » jusqu'à 15 h, « ce soir » ensuite. */
const repas = (heure: number) => `Je mange quoi ${heure >= 5 && heure < 15 ? "ce midi" : "ce soir"} ?`;

/* Les réponses proposées, situation par situation.

   ⚠️ CE QUE QUELQU'UN DIT, PAS UN MENU. Elles partent telles quelles au
   coach, donc elles doivent ressembler à une phrase de quelqu'un, et aucun
   adjectif ne s'accorde (« fatigué » mettrait tout le monde au masculin).
   ⚠️ UNE SEULE ACTION LOCALE PAR SITUATION, et c'est toujours la
   première : elle fait ce que le bouton violet du héros ferait, sans
   passer par le coach. Les autres demandent quelque chose au coach, qui
   prend alors la main. */
function brouillonsDe(s: SituationOuverture, heure: number): BrouillonOuverture[] {
  switch (s.genre) {
    case "reprise":
      return [
        { texte: "On la termine", action: "reprendre" },
        { texte: "Plutôt autre chose aujourd’hui" },
      ];
    case "seance":
      return [
        { texte: "On y va", action: "lancer" },
        { texte: "J’ai moins de temps aujourd’hui" },
        { texte: "Décale-la à demain" },
      ];
    case "etape":
      return [
        { texte: "On la fait maintenant", action: "lancer" },
        { texte: "J’ai moins de temps aujourd’hui" },
      ];
    case "faite":
      return [
        { texte: repas(heure) },
        { texte: "Une idée pour bien récupérer" },
      ];
    case "repos":
      return [
        { texte: "Une séance douce quand même" },
        { texte: repas(heure) },
      ];
    case "libre":
      return [
        { texte: "Fais-moi une séance" },
        { texte: "J’ai 30 minutes" },
        { texte: "Prépare ma semaine" },
      ];
    case "aucune":
      return [
        { texte: "Fais-moi une séance jambes" },
        { texte: estSoir(heure) ? "J’ai 30 minutes ce soir" : "J’ai 30 minutes aujourd’hui" },
        { texte: repas(heure) },
        { texte: "Passe en mode sombre" },
      ];
  }
}

function bulleDe(guide: GuideRef, s: SituationOuverture): string {
  switch (s.genre) {
    case "reprise":
      return voix(guide, "ouverture.reprise", { titre: s.titre, position: s.position ?? undefined, total: s.total ?? undefined });
    case "seance":
      return voix(guide, "ouverture.seance", { titre: s.titre, minutes: s.minutes ?? undefined });
    case "etape":
      return voix(guide, "ouverture.etape", { titre: s.titre, jour: s.quand ?? undefined });
    case "faite":
      return voix(guide, "ouverture.faite", { titre: s.titre ?? undefined });
    case "repos":
      return voix(guide, "ouverture.repos");
    case "libre":
      return voix(guide, "ouverture.libre");
    case "aucune":
      return voix(guide, "accueil.invite");
  }
}

/** La flamme se dit à partir de trois jours : « un jour d'affilée » ne
 *  veut rien dire, et deux, c'est encore la Lueur. */
export const SERIE_DITE = 3;

export function composerOuverture(guide: GuideRef, o: {
  situation: SituationOuverture;
  pseudo: string | null;
  /** La série en cours (`serie_aura`), ou `null` si on ne l'a pas lue. */
  serie: number | null;
  heure: number;
  /** Le bouton principal lancerait quelque chose : sinon, « On y va » ne
   *  propose rien qui marcherait. */
  peutLancer: boolean;
  /** Le coach peut encore répondre aujourd'hui (messages gratuits restants). */
  coach: boolean;
}): Ouverture {
  const salut = voix(guide, "accueil.salut", { pseudo: o.pseudo ?? "", soir: estSoir(o.heure) });
  const serie = o.serie ?? 0;
  let premiere = salut;
  if (serie >= SERIE_DITE) {
    const f = etatFlamme(serie);
    premiere = `${salut} ${voix(guide, "ouverture.flamme", { serie, flamme: f.nouvelle ? f.palier.le : undefined })}`;
  }
  const brouillons = brouillonsDe(o.situation, o.heure).filter((b) =>
    b.action ? (b.action === "reprendre" || o.peutLancer) : o.coach);
  return {
    situation: o.situation.genre,
    bulles: [premiere, bulleDe(guide, o.situation)],
    brouillons,
  };
}
