"use client";

/* ════════════════════════════════════════════════════════════════════
   Les cinq sections de questions, après le choix du Guide.

   ⚠️ Les QUESTIONS sont communes à Nora et Sasha : mêmes libellés,
   mêmes options, mêmes colonnes écrites. Ce qui change, c'est la phrase
   qui OUVRE la section, et elle vit dans `lib/guides.ts`
   (`bienvenue.section.*`), jamais ici. Ce fichier ne contient donc
   aucune parole de Guide, et il ne doit jamais en contenir : le jour où
   une chaîne d'ici varie selon Nora ou Sasha, elle est au mauvais
   endroit.

   Le Guide ouvre l'étape puis se tait pendant qu'on répond. Pas un mot
   après chaque clic : ce serait un commentateur, pas un guide.

   Les options viennent de `lib/profilOnboarding`, avec l'écriture. Il y
   a eu jusqu'à quatre écrans pour remplir ces colonnes, chacun avec sa
   propre liste : ils n'écrivaient pas les mêmes valeurs dans la même
   colonne, donc la même personne n'avait pas le même profil selon la
   porte qu'elle avait prise. Il n'y a plus qu'un questionnaire, et plus
   qu'un vocabulaire.
   ════════════════════════════════════════════════════════════════════ */

import { GOALS, LEVELS, GENDERS, SESSIONS, MEALS, DIETS, type OnboardingData } from "@/lib/profilOnboarding";
import type { CleVoix } from "@/lib/guides";
import s from "./bienvenue.module.css";

/** Le lieu et le matériel, aux seules valeurs que le reste du code sait
 *  lire (`planning.ts` : readLieu, persistLieu, ctxFromLieu). */
export type Entrainement = {
  location: "salle" | "maison" | null;
  equip: "halteres" | "poids" | null;
};

export type Section = "corps" | "objectifs" | "niveau" | "entrainement" | "nutrition";

/** Titre de chaque section, et la ligne neutre quand il en reste une.
 *
 *  ⚠️ `ligne` est devenue RARE, et c'est le but. Chaque section porte
 *  maintenant une phrase du Guide (`bienvenue.section.*` dans
 *  `lib/guides.ts`), et quatre des cinq lignes neutres disaient
 *  exactement la même chose juste en dessous : « Dis-nous où et avec
 *  quoi tu t'entraînes le plus souvent » sous « Il me reste à
 *  comprendre où et avec quoi tu t'entraînes le plus souvent ». Une
 *  phrase incarnée suivie de sa reformulation d'interface, ce n'est pas
 *  deux fois plus clair, c'est deux fois plus long.
 *
 *  Une ligne ne survit donc que si elle dit quelque chose que le Guide
 *  ne dit pas. Il en reste UNE : le fait que les objectifs se cochent à
 *  plusieurs, qui est une règle de saisie et pas une intention. */
/** `voix` est une CLÉ, pas une phrase : le texte vit dans `guides.ts`.
 *  Le champ est obligatoire, donc ajouter une section sans lui donner sa
 *  phrase de Guide ne compile pas. */
export const SECTIONS: Record<Section, { titre: string; voix: CleVoix; ligne?: string }> = {
  corps: {
    titre: "Ton corps",
    voix: "bienvenue.section.corps",
  },
  objectifs: {
    titre: "Tes objectifs",
    voix: "bienvenue.section.objectifs",
    ligne: "Plusieurs choix possibles. Tu pourras en changer.",
  },
  niveau: {
    titre: "Ton niveau et ton rythme",
    voix: "bienvenue.section.niveau",
  },
  entrainement: {
    titre: "Ton entraînement",
    voix: "bienvenue.section.entrainement",
  },
  nutrition: {
    titre: "Ta nutrition",
    voix: "bienvenue.section.nutrition",
  },
};

export const ORDRE: Section[] = ["corps", "objectifs", "niveau", "entrainement", "nutrition"];

/* ════════════════════════════════════════════════════════════════════
   CE QUI MANQUE POUR PASSER À LA SUITE

   ⚠️ La liste vit ICI, avec les champs, et pas dans le parcours. C'est
   le même fichier qui dessine une question et qui dit si elle est
   répondue : on ne peut donc pas ajouter un champ en oubliant sa
   vérification, ni retirer un champ en laissant une vérification qui
   bloque sur une question devenue invisible.

   Les libellés sont écrits pour se lire APRÈS « Il manque » : c'est le
   parcours qui compose la phrase, parce que lui seul sait combien
   d'éléments il a à annoncer.

   ⚠️ ON NE VÉRIFIE QUE LA PRÉSENCE, jamais la vraisemblance. Un âge
   « raisonnable » ou une taille « normale » sont des jugements, et le
   jour où quelqu'un tombe hors de nos bornes on lui refuse l'entrée de
   l'app pour un chiffre juste. Un nombre positif suffit.
   ════════════════════════════════════════════════════════════════════ */
const nombreDonne = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) && n > 0;
};

export function champsManquants(
  section: Section,
  data: OnboardingData,
  entrainement: Entrainement,
): string[] {
  const manque: string[] = [];
  if (section === "corps") {
    if (!nombreDonne(data.age)) manque.push("ton âge");
    if (!nombreDonne(data.height)) manque.push("ta taille");
    if (!nombreDonne(data.weight)) manque.push("ton poids");
    if (!data.gender) manque.push("ton genre");
  }
  if (section === "objectifs" && data.goals.length === 0) manque.push("un objectif");
  if (section === "niveau") {
    if (!data.level) manque.push("ton niveau");
    if (!data.sessionsPerWeek) manque.push("ton nombre de séances par semaine");
  }
  if (section === "entrainement") {
    if (!entrainement.location) manque.push("l'endroit où tu t'entraînes");
    // La question du matériel n'existe qu'à la maison : on ne réclame
    // jamais une réponse à une question qui n'est pas à l'écran.
    else if (entrainement.location === "maison" && !entrainement.equip) manque.push("ton matériel");
  }
  if (section === "nutrition") {
    if (!data.mealsPerDay) manque.push("ton nombre de repas");
    if (!data.diet) manque.push("ton type d'alimentation");
  }
  return manque;
}

/* ── Briques ─────────────────────────────────────────────────────── */

function Pastille({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={actif ? `${s.pastille} ${s.pastilleActive}` : s.pastille}
    >
      {children}
    </button>
  );
}

function Nombre({ id, label, unite, valeur, onChange, aide }: {
  id: string; label: string; unite: string; valeur: string;
  onChange: (v: string) => void; aide?: string;
}) {
  return (
    <div>
      <label className={s.libelle} htmlFor={id}>{label} ({unite})</label>
      <input
        id={id}
        className={s.saisie}
        type="number"
        inputMode="numeric"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
      />
      {aide && <span className={s.aide}>{aide}</span>}
    </div>
  );
}

/* ── Les sections ────────────────────────────────────────────────── */

export default function EtapesProfil({
  section, data, setData, entrainement, setEntrainement,
}: {
  section: Section;
  data: OnboardingData;
  setData: (patch: Partial<OnboardingData>) => void;
  entrainement: Entrainement;
  setEntrainement: (patch: Partial<Entrainement>) => void;
}) {
  if (section === "corps") {
    return (
      <div className={s.champs}>
        <Nombre id="ob-age"    label="Âge"    unite="ans" valeur={data.age}    onChange={(v) => setData({ age: v })} />
        <Nombre id="ob-taille" label="Taille" unite="cm"  valeur={data.height} onChange={(v) => setData({ height: v })} />
        <Nombre id="ob-poids"  label="Poids"  unite="kg"  valeur={data.weight} onChange={(v) => setData({ weight: v })} />
        <div>
          <span className={s.libelle}>Genre</span>
          <div className={s.pastilles}>
            {GENDERS.map((g) => (
              <Pastille key={g.id} actif={data.gender === g.id} onClick={() => setData({ gender: data.gender === g.id ? "" : g.id })}>
                {g.label}
              </Pastille>
            ))}
          </div>
          {/* ⚠️ « Sans lien avec ton Guide » est OBLIGATOIRE : le choix
              juste avant était « Nora ou Sasha », et sans cette phrase la
              question se lit comme une confirmation de ce choix.

              ⚠️ Le sujet est « Vaiiya », pas « le coach ». Trois noms se
              disputaient la même place dans cet écran (Vaiiya, ton Guide,
              le coach), et le troisième était un personnage qui n'existe
              pas. Règle : Vaiiya pour le produit, Nora/Sasha ou « ton
              Guide » pour l'accompagnement, jamais « le coach ».

              VÉRIFIÉ, la phrase n'est pas du décor : le genre nourrit
              l'estimation des besoins caloriques (`lib/nutritionGoals`,
              qui s'en sert pour le métabolisme de base) ET le contexte
              envoyé au modèle (`api/chat`). D'où « certains calculs et
              conseils », qui couvre exactement ces deux usages. */}
          <span className={s.aide}>
            Vaiiya en tient compte pour certains calculs et conseils. Sans lien avec ton Guide.
          </span>
        </div>
      </div>
    );
  }

  if (section === "objectifs") {
    return (
      <div className={s.pastilles}>
        {GOALS.map((g) => (
          <Pastille
            key={g.id}
            actif={data.goals.includes(g.id)}
            onClick={() => setData({
              goals: data.goals.includes(g.id) ? data.goals.filter((x) => x !== g.id) : [...data.goals, g.id],
            })}
          >
            {g.emoji} {g.label}
          </Pastille>
        ))}
      </div>
    );
  }

  if (section === "niveau") {
    return (
      <div className={s.champs}>
        <div>
          <span className={s.libelle}>Niveau</span>
          <div className={s.pastilles}>
            {LEVELS.map((l) => (
              <Pastille key={l.id} actif={data.level === l.id} onClick={() => setData({ level: data.level === l.id ? "" : l.id })}>
                {l.label} · {l.sub}
              </Pastille>
            ))}
          </div>
        </div>
        <div>
          <span className={s.libelle}>Séances par semaine</span>
          <div className={s.pastilles}>
            {SESSIONS.map((n) => (
              <Pastille key={n} actif={data.sessionsPerWeek === n} onClick={() => setData({ sessionsPerWeek: data.sessionsPerWeek === n ? "" : n })}>
                {n}
              </Pastille>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === "entrainement") {
    return (
      <div className={s.champs}>
        <div>
          <span className={s.libelle}>Où</span>
          <div className={s.pastilles}>
            <Pastille actif={entrainement.location === "salle"} onClick={() => setEntrainement({ location: "salle", equip: null })}>
              En salle
            </Pastille>
            <Pastille actif={entrainement.location === "maison"} onClick={() => setEntrainement({ location: "maison" })}>
              À la maison
            </Pastille>
          </div>
        </div>
        {/* Le matériel ne se demande qu'à la maison : en salle la question
            n'a pas de sens, et c'est exactement la règle que suit déjà
            l'assistant quand il lui manque le lieu. */}
        {entrainement.location === "maison" && (
          <div>
            <span className={s.libelle}>Avec quoi</span>
            <div className={s.pastilles}>
              <Pastille actif={entrainement.equip === "halteres"} onClick={() => setEntrainement({ equip: "halteres" })}>
                Des haltères
              </Pastille>
              <Pastille actif={entrainement.equip === "poids"} onClick={() => setEntrainement({ equip: "poids" })}>
                Au poids du corps
              </Pastille>
            </div>
          </div>
        )}
        {/* ⚠️ La seconde moitié de cette phrase a été SUPPRIMÉE, pas
            reformulée : elle était fausse. Elle promettait que le coach
            « te le redemandera si ton contexte change ». Vérifié dans
            `AssistantContext` (`questionManquante`) : le Guide ne pose la
            question que si le lieu est INCONNU, jamais parce qu'il aurait
            changé, et rien ne surveille ce changement. Réécrire « ton
            Guide pourra te le redemander » aurait gardé une promesse que
            le code ne tient pas.

            Ce qui reste est vrai et vérifiable : le lieu se change depuis
            le programme (`WeeklyProgramme`), et en le disant au Guide
            (outil `save_lieu`). */}
        <span className={s.aide}>
          Tu pourras changer ça à tout moment, depuis ton programme ou en le disant à ton Guide.
        </span>
      </div>
    );
  }

  return (
    <div className={s.champs}>
      <div>
        <span className={s.libelle}>Repas par jour</span>
        <div className={s.pastilles}>
          {MEALS.map((m) => (
            <Pastille key={m} actif={data.mealsPerDay === m} onClick={() => setData({ mealsPerDay: data.mealsPerDay === m ? "" : m })}>
              {m}
            </Pastille>
          ))}
        </div>
      </div>
      <div>
        <span className={s.libelle}>Alimentation</span>
        <div className={s.pastilles}>
          {DIETS.map((d) => (
            <Pastille key={d.id} actif={data.diet === d.id} onClick={() => setData({ diet: data.diet === d.id ? "" : d.id })}>
              {d.emoji} {d.label}
            </Pastille>
          ))}
        </div>
      </div>
    </div>
  );
}
