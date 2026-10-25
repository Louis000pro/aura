"use client";

/* ════════════════════════════════════════════════════════════════════
   « Ma journée » : le détail derrière « Voir le détail » (direction 2 de
   la maquette « La nutrition accueillante », Louis, 2026-10-22).

   Ce qu'on a mangé d'abord, une affiche par repas (sa photo quand on en a
   une qui dit vraiment ce plat), puis les repas encore vides, puis les
   extras en liste, puis les chiffres, chacun avec une phrase qui dit à
   quoi il sert. Les jours se parcourent avec la pastille du haut, le mois
   s'ouvre par le bouton calendrier.

   ⚠️ « RIEN D'AJOUTÉ » N'EST PAS UN REPROCHE. Un repas vide est une porte
   pour ajouter, pas une case rouge. Et un jour hors de la fenêtre gratuite
   ne se présente jamais comme vide : il porte l'encart Vaiiya+ (lib/historique).

   ⚠️ UN EXTRA N'A JAMAIS DE CASE VIDE (Louis, 2026-10-25). Ce qu'on prend
   entre les repas (un shaker, un fruit, un café au lait) se note autant de
   fois qu'on veut, à n'importe quelle heure : la liste des extras finit sur
   « Ajouter un extra », jamais sur « rien d'ajouté ». Les extras comptent
   dans les chiffres du jour.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import HistoriqueMasque from "@/components/historique/HistoriqueMasque";
import NutritionCalendar from "@/components/nutrition/NutritionCalendar";
import ImageRepas from "@/components/nutrition/ImageRepas";
import Sheet from "@/components/communaute/Sheet";
import { photoDuRepas, estRecetteVaiiya } from "@/lib/photoRepas";
import { localDateStr, shiftDateStr } from "@/lib/dates";
import { EXTRA, MEAL_META, REPAS_PRINCIPAUX, estExtra, heureLisible, milliers, type MealEntry, type MealType } from "@/lib/repas";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import ns from "@/components/nutrition/Nutrition.module.css";

type Objectifs = { calories: number; proteins: number; carbs: number; fats: number };

const MACROS: { cle: "proteins" | "carbs" | "fats"; nom: string; court: string; couleur: string; texte: string }[] = [
  { cle: "proteins", nom: "Protéines", court: "protéines", couleur: "#8B5CF6", texte: "Elles construisent et réparent les muscles." },
  { cle: "carbs", nom: "Glucides", court: "glucides", couleur: "#E8620C", texte: "Ils donnent de l’énergie, surtout pour le sport." },
  { cle: "fats", nom: "Lipides", court: "lipides", couleur: "#2BD4A0", texte: "Les graisses dont le corps a besoin chaque jour." },
];

/** « 2026-10-21 » → « Mardi 21 octobre ». */
function libelleJour(date: string): string {
  const [a, m, j] = date.split("-").map(Number);
  const t = new Date(a, m - 1, j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Un nombre de calories : au chiffre mono sous 1 000, jamais au-delà
 *  (l'espace des milliers prendrait une case entière, voir `.vy-nombre`). */
function Kcal({ n, taille, graisse }: { n: number; taille: number; graisse: number }) {
  const v = Math.round(n);
  return v < 1000
    ? <span className="vy-nombre" style={{ fontSize: taille, fontWeight: graisse, lineHeight: 1 }}>{v}</span>
    : <span style={{ fontSize: taille, fontWeight: graisse, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{milliers(v)}</span>;
}

function CarteRepas({ repas, onOuvrir }: { repas: MealEntry; onOuvrir: () => void }) {
  const photo = photoDuRepas(repas.name);
  const moment = `${MEAL_META[repas.mealType]?.label ?? "Repas"} · ${heureLisible(repas.time)}`;
  const note = estRecetteVaiiya(repas.name) ? "recette Vaiiya" : repas.hasPhoto ? "d’après la photo" : null;

  return (
    <button type="button" onClick={onOuvrir} className={`${ns.carte} overflow-hidden text-left cursor-pointer`}>
      {photo ? (
        <span className="relative block" style={{ height: 168 }}>
          <ImageRepas nom={repas.name} className="absolute inset-0 h-full w-full" icone={28} />
          <span className={ns.voileBas} />
          <span className="absolute inset-x-4 bottom-3.5 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>{moment}</span>
            <span className="line-clamp-2 text-[20px] font-bold text-white" style={{ lineHeight: 1.15 }}>{repas.name}</span>
          </span>
        </span>
      ) : (
        <span className="flex flex-col gap-0.5 px-4 pt-4">
          <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>{moment}</span>
          <span className="line-clamp-2 text-[20px] font-bold" style={{ color: "var(--text-0)", lineHeight: 1.15 }}>{repas.name}</span>
        </span>
      )}
      <span className="grid items-end gap-1.5 px-4 pb-3.5 pt-3" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
        <span className="flex flex-col gap-0.5">
          <span style={{ color: "var(--text-0)" }}>
            <Kcal n={repas.calories} taille={20} graisse={700} /> <span className="text-[11px]" style={{ color: "var(--text-3)" }}>kcal</span>
          </span>
          {note && <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{note}</span>}
        </span>
        {MACROS.map((m) => (
          <span key={m.cle} className="flex flex-col gap-0.5">
            <span style={{ color: "var(--text-0)" }}>
              <span className="vy-nombre text-[16px]" style={{ fontWeight: 700 }}>{Math.round(repas[m.cle] || 0)}</span>
              {" "}<span className="text-[11px]" style={{ color: "var(--text-3)" }}>g</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
              <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: m.couleur }} />
              {m.court}
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

function FeuilleRepas({ repas, onFermer, onRetirer }: {
  repas: MealEntry;
  onFermer: () => void;
  onRetirer: () => void;
}) {
  const [confirme, setConfirme] = useState(false);
  return (
    <Sheet onFermer={onFermer} niveau={95}>
      <div className="flex flex-col gap-4 pb-1">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
            {MEAL_META[repas.mealType]?.label ?? "Repas"} · {heureLisible(repas.time)}
          </span>
          <h3 className="text-[20px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{repas.name}</h3>
          <span className="text-[13px]" style={{ color: "var(--text-2)" }}>
            {milliers(repas.calories)}&nbsp;kcal · {Math.round(repas.proteins || 0)}&nbsp;g de protéines · {Math.round(repas.carbs || 0)}&nbsp;g de glucides · {Math.round(repas.fats || 0)}&nbsp;g de lipides
          </span>
        </div>
        {!confirme ? (
          <button type="button" onClick={() => setConfirme(true)}
            className={`${ns.danger} min-h-12 text-[16px] font-semibold cursor-pointer`} style={{ borderRadius: "var(--r-controle)" }}>
            Retirer ce repas
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Il disparaît de ta journée.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onFermer} className="min-h-12 text-[16px] font-semibold cursor-pointer"
                style={{ borderRadius: "var(--r-controle)", color: "var(--text-1)", background: "rgba(var(--text-3-rgb),0.12)" }}>
                Le garder
              </button>
              <button type="button" onClick={onRetirer} className={`${ns.danger} min-h-12 text-[16px] font-bold cursor-pointer`}
                style={{ borderRadius: "var(--r-controle)" }}>
                Oui, le retirer
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export default function JourneeNutrition({
  date, aujourdhui, premierJour, repas, masque, objectifs,
  onRetour, onDate, onAjouter, onRetirer, onComprendre,
}: {
  date: string;
  aujourdhui: string;
  /** Le jour de l'inscription : on ne remonte pas avant. `null` si inconnu. */
  premierJour: string | null;
  /** `null` tant que la base n'a pas répondu. */
  repas: MealEntry[] | null;
  /** Jour hors de la fenêtre gratuite : rien ne se lit, l'encart le dit. */
  masque: boolean;
  objectifs: Objectifs;
  onRetour: () => void;
  onDate: (d: string) => void;
  onAjouter: (type: MealType) => void;
  onRetirer: (id: string) => void;
  onComprendre: () => void;
}) {
  const [mois, setMois] = useState(false);
  const [ouvert, setOuvert] = useState<MealEntry | null>(null);
  useRetourTelephone(mois, "nutritionMois", () => setMois(false));

  const estAujourdhui = date === aujourdhui;
  const peutAvant = !premierJour || date > premierJour;
  const peutApres = date < aujourdhui;

  const total = (cle: "calories" | "proteins" | "carbs" | "fats") => (repas ?? []).reduce((t, m) => t + (m[cle] || 0), 0);
  const principaux = (repas ?? []).filter((m) => !estExtra(m));
  const extras = (repas ?? []).filter(estExtra);
  const kcalExtras = extras.reduce((t, m) => t + (m.calories || 0), 0);
  const vides = repas ? REPAS_PRINCIPAUX.filter((t) => !repas.some((m) => m.mealType === t)) : [];
  const repere = Math.round(objectifs.calories / 50) * 50;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => (mois ? setMois(false) : onRetour())} className={ns.rond}
            aria-label={mois ? "Revenir à la journée" : "Revenir à la nutrition"}>
            <ChevronLeft size={19} strokeWidth={2.2} />
          </button>
          {!mois && (
            <button type="button" onClick={() => setMois(true)} className={ns.rond} aria-label="Voir le mois">
              <CalendarDays size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        <h1 className="text-[34px] leading-none" style={{ color: "var(--text-0)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
          {mois ? "Mon mois" : "Ma journée"}
        </h1>
        {!mois && (
          <div className={`${ns.bloc} items-center self-start`} style={{ flexDirection: "row", borderRadius: 999 }}>
            <button type="button" onClick={() => peutAvant && onDate(shiftDateStr(date, -1))} aria-label="Jour précédent"
              aria-disabled={!peutAvant}
              className="flex h-11 w-11 items-center justify-center cursor-pointer" style={{ color: "var(--text-1)", opacity: peutAvant ? 1 : 0.35 }}>
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <span className="text-[13px] font-bold" style={{ color: "var(--text-0)" }}>{libelleJour(date)}</span>
            <button type="button" onClick={() => peutApres && onDate(shiftDateStr(date, 1))} aria-label="Jour suivant"
              aria-disabled={!peutApres}
              className="flex h-11 w-11 items-center justify-center cursor-pointer" style={{ color: "var(--text-1)", opacity: peutApres ? 1 : 0.35 }}>
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>

      {mois ? (
        <NutritionCalendar onDayClick={(d) => { onDate(localDateStr(d)); setMois(false); }} />
      ) : (
        <>
          <section className="flex flex-col gap-3" aria-label="Ce que j’ai mangé">
            <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
              Ce que j’ai mangé
            </h2>
            {masque ? (
              <HistoriqueMasque />
            ) : repas === null ? (
              <span aria-hidden className="h-40 w-full animate-pulse" style={{ borderRadius: "var(--r-affiche)", background: "rgba(var(--text-3-rgb),0.14)" }} />
            ) : (
              <>
                {principaux.map((m) => <CarteRepas key={m.id} repas={m} onOuvrir={() => setOuvert(m)} />)}
                {vides.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {vides.map((t) => (
                      <button key={t} type="button" onClick={() => onAjouter(t)}
                        aria-label={`Ajouter ${t === "diner" ? "mon dîner" : t === "dejeuner" ? "mon déjeuner" : "mon petit-déjeuner"}`}
                        className={`${ns.bloc} items-center justify-between gap-2 cursor-pointer odd:last:col-span-2`}
                        style={{ flexDirection: "row", minHeight: 64, padding: 12 }}>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[16px] font-bold" style={{ color: "var(--text-0)" }}>{MEAL_META[t].label}</span>
                          <span className="text-[11px]" style={{ color: "var(--text-3)" }}>rien d’ajouté</span>
                        </span>
                        <span aria-hidden className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: "linear-gradient(135deg,#8B5CF6,#C13BC1)", color: "#fff" }}>
                          <Plus size={16} strokeWidth={2.8} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {!masque && repas !== null && (
            <section className="flex flex-col gap-3" aria-label="Les extras">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
                  Les extras
                </h2>
                {extras.length > 0 && (
                  <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{extras.length} · {milliers(kcalExtras)}&nbsp;kcal</span>
                )}
              </div>
              <div className={`${ns.bloc} overflow-hidden`}>
                {extras.map((m) => (
                  <button key={m.id} type="button" onClick={() => setOuvert(m)}
                    className="vy-filet flex min-h-16 items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer">
                    <ImageRepas nom={m.name} className="h-11 w-11 flex-shrink-0" style={{ borderRadius: 12 }} icone={18} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="line-clamp-2 text-[16px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>{m.name}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{heureLisible(m.time)}</span>
                    </span>
                    <span className="ml-auto flex-shrink-0" style={{ color: "var(--text-0)" }}>
                      <Kcal n={m.calories} taille={16} graisse={700} /> <span className="text-[11px]" style={{ color: "var(--text-3)" }}>kcal</span>
                    </span>
                  </button>
                ))}
                <button type="button" onClick={() => onAjouter(EXTRA)}
                  className="vy-filet flex min-h-16 items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-bold cursor-pointer"
                  style={{ color: "var(--exp-encre)" }}>
                  <span aria-hidden className="flex h-11 w-11 flex-shrink-0 items-center justify-center"
                    style={{ borderRadius: 12, border: "1.5px dashed rgba(109,75,214,0.45)" }}>
                    <Plus size={18} strokeWidth={2.4} />
                  </span>
                  Ajouter un extra
                </button>
              </div>
            </section>
          )}

          {!masque && repas !== null && (
            <section className="flex flex-col gap-3" aria-label="Les chiffres du jour">
              <h2 className="text-[20px]" style={{ color: "var(--text-0)", fontWeight: 750, fontVariationSettings: "var(--w-voix)" }}>
                Les chiffres du jour
              </h2>
              <div className={`${ns.bloc} ${ns.chaud}`} style={{ padding: 16, gap: 6 }}>
                <span className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>Calories</span>
                <span className="flex items-baseline gap-2" style={{ color: "var(--text-0)" }}>
                  <Kcal n={total("calories")} taille={44} graisse={800} />
                  <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{estAujourdhui ? "kcal aujourd’hui" : "kcal ce jour-là"}</span>
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  L’énergie que t’apportent les aliments{kcalExtras > 0 ? `, dont ${milliers(kcalExtras)} kcal d’extras` : ""}. Repère pour toi&nbsp;: environ {milliers(repere)}&nbsp;kcal par jour.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {MACROS.map((m) => {
                  const val = total(m.cle);
                  const rep = objectifs[m.cle];
                  return (
                    <div key={m.cle} className={ns.bloc} style={{ padding: 12, gap: 6 }}>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "var(--text-3)" }}>
                        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
                        {m.nom}
                      </span>
                      <span style={{ color: "var(--text-0)" }}>
                        <span className="vy-nombre text-[26px]" style={{ fontWeight: 800 }}>{Math.round(val)}</span>
                        {" "}<span className="text-[13px]" style={{ color: "var(--text-3)" }}>g sur {Math.round(rep)}&nbsp;g</span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(var(--text-3-rgb),0.16)" }}>
                        <span className="block h-full rounded-full"
                          style={{ width: `${Math.min(100, rep > 0 ? Math.round((val / rep) * 100) : 0)}%`, background: m.couleur }} />
                      </span>
                      <span className="text-[11px] leading-snug" style={{ color: "var(--text-2)" }}>{m.texte}</span>
                    </div>
                  );
                })}
                <button type="button" onClick={onComprendre}
                  className={`${ns.bloc} justify-between cursor-pointer`}
                  style={{ padding: 12, gap: 8, background: "linear-gradient(145deg, rgba(139,92,246,.16), rgba(193,59,193,.12)), var(--verre-carte)" }}>
                  <span className="text-[11px] font-bold" style={{ color: "var(--exp-encre)" }}>Comprendre</span>
                  <span className="text-[13px] font-bold leading-snug" style={{ color: "var(--text-0)" }}>Les mini-cours sur la nutrition</span>
                  <ArrowRight size={16} strokeWidth={2.4} style={{ color: "var(--exp-encre)" }} />
                </button>
              </div>
              <p className="mx-1 text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                Les repères sont calculés à partir de ton profil et de ta dernière pesée.
              </p>
            </section>
          )}
        </>
      )}

      <AnimatePresence>
        {ouvert && (
          <FeuilleRepas key={ouvert.id} repas={ouvert} onFermer={() => setOuvert(null)}
            onRetirer={() => { onRetirer(ouvert.id); setOuvert(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
