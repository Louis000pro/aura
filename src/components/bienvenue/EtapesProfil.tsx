"use client";

/* ════════════════════════════════════════════════════════════════════
   Les cinq sections de questions, après le choix du Guide.

   ⚠️ Elles sont COMMUNES à Nora et Sasha. Le Guide reste identifiable en
   haut de l'écran (portrait + prénom), mais il ne reprend pas la parole
   à chaque question : une personnalité réinjectée à chaque clic sonne
   faux, allonge tout, et ferait croire à deux questionnaires différents
   alors que ce sont exactement les mêmes questions et les mêmes
   réponses possibles.

   Les options viennent de `OnboardingModal`, où elles vivaient déjà :
   deux écrans qui remplissent les mêmes colonnes doivent proposer les
   mêmes valeurs, sinon la même personne n'a pas le même profil selon la
   porte qu'elle a prise.
   ════════════════════════════════════════════════════════════════════ */

import { GOALS, LEVELS, GENDERS, SESSIONS, MEALS, DIETS, type OnboardingData } from "@/components/OnboardingModal";
import s from "./bienvenue.module.css";

/** Le lieu et le matériel, aux seules valeurs que le reste du code sait
 *  lire (`planning.ts` : readLieu, persistLieu, ctxFromLieu). */
export type Entrainement = {
  location: "salle" | "maison" | null;
  equip: "halteres" | "poids" | null;
};

export type Section = "corps" | "objectifs" | "niveau" | "entrainement" | "nutrition";

/** Titre et ligne d'explication de chaque section. Textes COMMUNS. */
export const SECTIONS: Record<Section, { titre: string; ligne: string }> = {
  corps: {
    titre: "Ton corps",
    ligne: "Pour calibrer tes séances et tes repères.",
  },
  objectifs: {
    titre: "Tes objectifs",
    ligne: "Choisis ce que tu veux faire évoluer. Tu pourras en changer.",
  },
  niveau: {
    titre: "Ton niveau et ton rythme",
    ligne: "Ça nous aide à ajuster le niveau et le rythme de tes séances.",
  },
  entrainement: {
    titre: "Ton entraînement",
    ligne: "Dis-nous où et avec quoi tu t'entraînes le plus souvent.",
  },
  nutrition: {
    titre: "Ta nutrition",
    ligne: "Pour ajuster tes repères de repas, si tu t'en sers.",
  },
};

export const ORDRE: Section[] = ["corps", "objectifs", "niveau", "entrainement", "nutrition"];

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
          {/* ⚠️ Cette précision est OBLIGATOIRE : le choix juste avant
              était « Nora ou Sasha », et sans elle la question suivante
              se lit comme une confirmation de ce choix. La première
              phrase dit ce à quoi la donnée sert VRAIMENT : elle nourrit
              l'estimation des besoins caloriques (lib/nutritionGoals) ET
              le contexte envoyé au coach (api/chat). Écrire « sert au
              calcul calorique » tout court serait faux. */}
          <span className={s.aide}>
            Sert à estimer tes besoins, et le coach en tient compte. Sans lien avec ton Guide.
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
        <span className={s.aide}>
          Tu pourras le changer à tout moment, et le coach te le redemandera si ton contexte change.
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
