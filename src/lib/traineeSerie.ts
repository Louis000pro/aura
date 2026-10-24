/* ─────────────────────────────────────────────────────────────────────
   LA TRAÎNÉE DE LA SÉRIE (Louis, 2026-10-17, page « La traînée » du
   canevas « Les rangs et le profil »).

   Le calendrier de la feuille de la série dessine les jours comme une
   traînée qui chauffe : chaque jour prend la couleur de la flamme QU'IL
   AVAIT ALLUMÉE, c'est-à-dire le palier atteint ce jour-là dans SA série.
   Le deuxième jour d'une série est une Lueur, le troisième une Flamme, le
   septième un Feu : une longue série se voit d'un coup d'œil.

   Ce module DÉCIDE, `CalendrierSerie` dessine. Il est pur : aucune
   requête, aucune horloge (aujourd'hui arrive en argument), aucun DOM.

   ⚠️ LE PALIER D'UN JOUR VIENT DE `palierFlamme`, la seule règle de palier
   du produit. Ici on ne fait que compter le rang du jour dans sa série.
   ⚠️ UNE SÉRIE CASSÉE REPART D'UNE LUEUR : après un jour sans, le rang
   revient à 1. Les séries passées GARDENT les couleurs qu'elles avaient
   gagnées, sans être atténuées : on montre ce qui a été fait.
   ⚠️ UN JOUR SANS N'EST JAMAIS COLORIÉ : ni rond, ni ruban, ni croix.
   ⚠️ LA TRAÎNÉE NE SE COUPE PAS EN FIN DE SEMAINE : au bout de la ligne,
   le ruban va jusqu'au bord et reprend au début de la suivante. Avant, une
   série du jeudi au mercredi se lisait comme deux séries.
   ⚠️ UN JOUR COUVERT PAR UN JOKER GARDE LA SÉRIE SANS COMPTER (Louis,
   2026-10-24, maquette « Le passage de rang ») : le jour d'après prend le
   rang qui suit celui de la veille du joker, et le ruban traverse le jour
   couvert. Lui n'a aucune couleur de flamme, il porte un bouclier. Les jours
   couverts viennent de la base (`serie_jokers_aura`), jamais d'ici.
   ───────────────────────────────────────────────────────────────────── */

import { shiftDateStr } from "./dates";
import { etatFlamme, palierFlamme, type IdFlamme, type PalierFlamme } from "./flammesSerie";

/**
 * Le rang de chaque jour actif dans SA série : 1 = son premier jour. Un jour
 * couvert par un joker ne compte pas, mais il relie : le jour qui le suit
 * continue la série de la veille du joker.
 */
export function rangsDesJours(actifs: Iterable<string>, couverts: Iterable<string> = []): Map<string, number> {
  // En `YYYY-MM-DD`, l'ordre alphabétique EST l'ordre des jours : la veille
  // est toujours rangée avant le jour qui la suit.
  const jours = [...new Set(actifs)].sort();
  const garde = new Set(couverts);
  const rangs = new Map<string, number>();
  for (const jour of jours) rangs.set(jour, (rangPorte(rangs, garde, shiftDateStr(jour, -1)) ?? 0) + 1);
  return rangs;
}

/**
 * Le rang que la série porte ce jour-là : le sien pour un jour tenu, celui
 * du dernier jour tenu pour un jour couvert (un joker garde la flamme, il
 * n'en allume pas). `null` pour un jour sans.
 */
export function rangPorte(rangs: ReadonlyMap<string, number>, couverts: ReadonlySet<string>, date: string): number | null {
  let jour = date;
  // Un jour couvert suit toujours un jour tenu ou un autre jour couvert :
  // on remonte jusqu'au premier qui n'est pas un joker.
  for (let i = 0; i < 400 && !rangs.has(jour) && couverts.has(jour); i++) jour = shiftDateStr(jour, -1);
  return rangs.get(jour) ?? null;
}

/** La flamme née ce jour-là (le 3ᵉ, le 7ᵉ, le 30ᵉ, le 100ᵉ jour), sinon `null`. */
export function flammeNee(rang: number): IdFlamme | null {
  const palier = palierFlamme(rang);
  return rang > 1 && palier.des === rang ? palier.id : null;
}

export type ProchaineFlamme = {
  /** Le jour où la flamme suivante naîtra, si la série continue. */
  date: string;
  palier: PalierFlamme;
  /** La tête de la série : le dernier jour tenu, ou gardé par un joker. */
  depuis: string;
};

/**
 * La prochaine flamme, posée sur sa date. La tête de la série est
 * aujourd'hui s'il compte déjà, sinon hier, tenu ou couvert : une série
 * tient jusqu'à minuit. `null` sans série en cours, et au Feu sacré, qui
 * n'a pas de suite.
 */
export function prochaineFlamme(
  rangs: ReadonlyMap<string, number>,
  aujourdhui: string,
  couverts: ReadonlySet<string> = new Set(),
): ProchaineFlamme | null {
  const hier = shiftDateStr(aujourdhui, -1);
  const depuis = rangs.has(aujourdhui) ? aujourdhui : rangs.has(hier) || couverts.has(hier) ? hier : null;
  if (!depuis) return null;
  const rang = rangPorte(rangs, couverts, depuis);
  if (!rang) return null;
  const { suivant } = etatFlamme(rang);
  if (!suivant) return null;
  return { date: shiftDateStr(depuis, suivant.des - rang), palier: suivant, depuis };
}

/**
 * Comment le ruban rejoint le bord d'une case :
 * · `centre` : il n'y va pas, le ruban s'arrête au rond ;
 * · `bord`   : il y va, la série continue sur la case voisine (au bout
 *              d'une ligne, c'est le bord du calendrier, et elle reprend
 *              au début de la ligne suivante) ;
 * · `fondu`  : la série vient du mois d'avant ou part vers le suivant, qui
 *              ne sont pas affichés : le ruban s'efface vers le bord.
 */
export type BordRuban = "centre" | "bord" | "fondu";

export type CaseJour = {
  date: string;
  numero: number;
  /** 0 = lundi … 6 = dimanche. */
  colonne: number;
  aujourdhui: boolean;
  futur: boolean;
  /** Ce jour dans la série : `null` pour un jour sans, et pour un jour couvert. */
  serie: { rang: number; palier: IdFlamme; nee: IdFlamme | null } | null;
  /** Un joker a gardé la série ce jour-là : pas de flamme, le ruban continue. */
  joker: boolean;
  /** Le ruban derrière le jour. Sa moitié droite passe à la couleur du lendemain (`vers`). */
  ruban: { gauche: BordRuban; droite: BordRuban; palier: IdFlamme; vers: IdFlamme } | null;
  /** La flamme qui naîtrait ce jour-là si la série continue. */
  prochaine: IdFlamme | null;
  /** Le chemin pointillé jusqu'à la prochaine flamme passe par ce jour. */
  chemin: { gauche: boolean; droite: boolean } | null;
};

function cle(annee: number, mois: number, jour: number): string {
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/**
 * Les cases d'un mois, lundi en tête : `null` pour les cases vides avant le
 * 1er. `mois` compte à partir de 0 (janvier), comme `Date`.
 */
export function grilleTrainee({
  annee,
  mois,
  rangs,
  aujourdhui,
  couverts,
}: {
  annee: number;
  mois: number;
  rangs: ReadonlyMap<string, number>;
  aujourdhui: string;
  /** Les jours gardés par un joker (`YYYY-MM-DD`). */
  couverts?: ReadonlySet<string>;
}): (CaseJour | null)[] {
  const garde = couverts ?? new Set<string>();
  const debut = new Date(Date.UTC(annee, mois, 1));
  const nbJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  const vides = (debut.getUTCDay() + 6) % 7;
  // La prochaine flamme ne se pose que si sa date est dans CE mois : un
  // chemin pointillé qui file jusqu'au bout du calendrier sans arriver
  // nulle part ne dirait rien. La phrase au-dessus du calendrier donne déjà
  // le nombre de jours.
  const suite = prochaineFlamme(rangs, aujourdhui, garde);
  const prochaine = suite && suite.date.startsWith(cle(debut.getUTCFullYear(), debut.getUTCMonth(), 1).slice(0, 8)) ? suite : null;
  const cases: (CaseJour | null)[] = Array.from({ length: vides }, () => null);
  // Un jour tenu porte son rang, un jour couvert celui de la flamme qu'il garde.
  const porte = (d: string) => rangPorte(rangs, garde, d);

  for (let numero = 1; numero <= nbJours; numero++) {
    const date = cle(debut.getUTCFullYear(), debut.getUTCMonth(), numero);
    const rang = rangs.get(date);
    const joker = rang === undefined && garde.has(date);
    const ici = porte(date);
    const lendemain = shiftDateStr(date, 1);
    const avant = ici !== null && porte(shiftDateStr(date, -1)) !== null;
    const apres = ici !== null && porte(lendemain) !== null;
    const palier = ici !== null ? palierFlamme(ici).id : null;

    let chemin: CaseJour["chemin"] = null;
    if (prochaine) {
      if (date === prochaine.depuis) chemin = { gauche: false, droite: true };
      else if (date > prochaine.depuis && date < prochaine.date) chemin = { gauche: true, droite: true };
      else if (date === prochaine.date) chemin = { gauche: true, droite: false };
    }

    cases.push({
      date,
      numero,
      colonne: (vides + numero - 1) % 7,
      aujourdhui: date === aujourdhui,
      futur: date > aujourdhui,
      serie: rang !== undefined && palier ? { rang, palier, nee: flammeNee(rang) } : null,
      joker,
      ruban:
        palier && (avant || apres)
          ? {
              gauche: !avant ? "centre" : numero === 1 ? "fondu" : "bord",
              droite: !apres ? "centre" : numero === nbJours ? "fondu" : "bord",
              palier,
              vers: apres ? palierFlamme(porte(lendemain) ?? 1).id : palier,
            }
          : null,
      prochaine: prochaine && date === prochaine.date && rang === undefined ? prochaine.palier.id : null,
      chemin,
    });
  }
  return cases;
}
