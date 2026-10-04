/* ════════════════════════════════════════════════════════════════════
   R2 · LE REMPLISSAGE DES PROGRAMMES EXISTANTS, GÉNÉRÉ

   Écrit `supabase/migrations/20261005_r2_modeles_existants.sql` à partir
   de la composition TypeScript (`composerEtape`), pour que le SQL ne soit
   jamais une seconde définition de la banque. `check:programme` régénère
   le texte et exige l'égalité avec le fichier commité.

   Usage : node --experimental-strip-types --import ./scripts/check-ia-alias.mjs scripts/r2-remplissage.ts
   ════════════════════════════════════════════════════════════════════ */
import { writeFileSync } from "node:fs";
import { BANQUE, COMPOSITION_VERSION, composerEtape, ETAPE_DE_REPLI, type Lieu, type Orientation } from "@/lib/banqueEtapes";

const q = (v: string | number | null) => (v === null ? "null" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

export function sqlRemplissage(): string {
  const lignes: string[] = [];
  for (const lieu of Object.keys(BANQUE) as Lieu[]) for (const nom of Object.keys(BANQUE[lieu])) for (const o of ["force", "masse", "general"] as Orientation[]) {
    for (const l of composerEtape(nom, { lieu, orientation: o, niveau: null, version: COMPOSITION_VERSION })) {
      lignes.push(`    (${[lieu, nom, o, l.emplacement, l.exercice_cle, l.exercice_nom, l.fonction, l.statut, l.series, l.mesure,
        l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s, l.charge_type, l.unite].map(q).join(", ")})`);
    }
  }
  const noms = [...new Set(Object.values(BANQUE).flatMap((b) => Object.keys(b)))].map(q).join(", ");
  return `/* ════════════════════════════════════════════════════════════════════
   R2 · LES MODÈLES DES PROGRAMMES DÉJÀ ACTIFS (tour 20 de Codex)

   ⚠️ FICHIER GÉNÉRÉ par \`scripts/r2-remplissage.ts\` depuis la composition
   TypeScript (version ${COMPOSITION_VERSION}). Ne pas l'éditer à la main :
   \`check:programme\` exige qu'il soit identique à la génération.

   À coller APRÈS \`20261005_r2_prescription.sql\`, et seulement après
   l'accord de Louis sur le comparatif. Rejouable.

   Ce qu'il fait : pour chaque étape d'un programme ACTIF qui n'a pas
   encore de modèle pour le lieu de la personne, il écrit ce modèle.
   Ce qu'il ne touche pas : les intentions (préparées, faites, en attente),
   leurs rangs, les journaux, les programmes archivés, les modèles déjà
   écrits (\`on conflict do nothing\`).
   ════════════════════════════════════════════════════════════════════ */

with banque (lieu, etape, orientation, emplacement, exercice_cle, exercice_nom, fonction, statut, series, mesure,
             reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite) as (
  values
${lignes.join(",\n")}
),
cible as (
  select ps.id as etape_id,
         case when ps.nom in (${noms}) then ps.nom else ${q(ETAPE_DE_REPLI)} end as etape,
         case when c.lieu = 'salle' then 'salle' when c.materiel = 'halteres' then 'halteres' else 'poids' end as lieu,
         /* \`orientationDe\` : la force d'abord, puis la masse, sinon général. */
         case when lower(coalesce(pr.onboarding_goals::text, '')) like '%force%' then 'force'
              when lower(coalesce(pr.onboarding_goals::text, '')) like '%masse%' then 'masse'
              else 'general' end as orientation,
         pr.onboarding_level as niveau
    from public.programmes p
    join public.programme_seances ps on ps.programme_id = p.id
    left join public.contexte_entrainement c on c.user_id = p.user_id
    left join public.profiles pr on pr.id = p.user_id
   where p.statut = 'actif'
),
modeles as (
  insert into public.etape_modeles (programme_seance_id, lieu, orientation, niveau, composition_version)
  select etape_id, lieu, orientation, niveau, ${COMPOSITION_VERSION} from cible
  on conflict (programme_seance_id, lieu) do nothing
  returning id, programme_seance_id, lieu, orientation
)
insert into public.etape_exercices (
  modele_id, emplacement, exercice_cle, exercice_nom, fonction, statut, series, mesure,
  reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite
)
select m.id, b.emplacement, b.exercice_cle, b.exercice_nom, b.fonction, b.statut, b.series, b.mesure,
       b.reps_min, b.reps_max, b.reps_cible, b.duree_s, b.repos_s, b.transition_s, b.charge_type, b.unite
  from modeles m
  join cible c on c.etape_id = m.programme_seance_id and c.lieu = m.lieu
  join banque b on b.lieu = c.lieu and b.etape = c.etape and b.orientation = m.orientation;
`;
}

if (process.argv[1]?.endsWith("r2-remplissage.ts")) {
  writeFileSync(new URL("../supabase/migrations/20261005_r2_modeles_existants.sql", import.meta.url), sqlRemplissage());
  console.log("écrit.");
}
