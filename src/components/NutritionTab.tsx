"use client";

/* ════════════════════════════════════════════════════════════════════
   L'écran Nutrition (direction 2 de la maquette « La nutrition
   accueillante », Louis, 2026-10-22 : « tu peux coder la direction 2 »).

   De haut en bas : la question du Guide sur le repas qui vient, avec trois
   portes photo · « Aujourd'hui », les repas du jour en polaroids et l'ajout
   · une idée de recette pour ce repas · six collections de la banque ·
   les mini-cours de nutrition. Le détail de la journée (« Ma journée ») et
   une collection s'ouvrent en vue pleine, et le retour du téléphone les
   referme (useRetourTelephone).

   ⚠️ CE QUI EST PARTI, ET NE DOIT PAS REVENIR : la rangée des sept jours
   (les jours se parcourent dans le détail), les deux tuiles de chiffres en
   tête (les chiffres vivent dans le détail, chacun avec une phrase qui dit
   à quoi il sert), les « recettes par thème » générées par l'IA (des tuiles
   blanches à emoji, remplacées par les collections en photo) et les
   pastilles « coups de cœur » (les derniers repas vivent dans « Ajouter un
   repas »). Aucun objectif à atteindre n'est montré en tête : on montre ce
   qui a été mangé, jamais ce qui manque.

   ⚠️ CHAQUE ÉCRITURE DU JOURNAL SIGNALE LE GUIDE (`signalerRepas`), et les
   six écritures restent ICI : `check:programme` les compte dans ce fichier.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGuideActif } from "@/context/GuideContext";
import { useAssistant } from "@/context/AssistantContext";
import { createClient } from "@/lib/supabase";
import { signalerRepas } from "@/lib/guideNutrition";
import { debutHistorique, historiqueComplet } from "@/lib/historique";
import { localDateStr } from "@/lib/dates";
import { loadTasteProfileLocal } from "@/lib/tasteProfile";
import { fitReason, type DayNeeds, type Recipe } from "@/lib/recipeBank";
import {
  COLLECTIONS, DEMANDE_AU_GUIDE, besoinsDuJour, ideesDuMoment, recettesDe, regimeConnu, type IdCollection,
} from "@/lib/collectionsRecettes";
import {
  classerRecents, heureMaintenant, ligneVersRepas, momentActuel, nomComparable,
  type MealEntry, type MealType, type NouveauRepas, type RecentMeal,
} from "@/lib/repas";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useJourLocal, useMomentRepas } from "@/hooks/useHorloge";
import { useRetourTelephone } from "@/hooks/useRetourTelephone";
import { useEpinglesRepas } from "@/hooks/useEpinglesRepas";
import WeighInPrompt from "@/components/WeighInPrompt";
import TastePrefsPrompt from "@/components/TastePrefsPrompt";
import MealSituationHero from "@/components/MealSituationHero";
import RecipeSheet from "@/components/RecipeSheet";
import CarteAujourdhui from "@/components/nutrition/CarteAujourdhui";
import IdeesDuMoment from "@/components/nutrition/IdeesDuMoment";
import TrouverRecette from "@/components/nutrition/TrouverRecette";
import ComprendreNutrition from "@/components/nutrition/ComprendreNutrition";
import CollectionRecettes from "@/components/nutrition/CollectionRecettes";
import JourneeNutrition from "@/components/nutrition/JourneeNutrition";
import FeuilleAjoutRepas from "@/components/nutrition/FeuilleAjoutRepas";
import PhotoAnalysisModal from "@/components/nutrition/PhotoAnalysisModal";
import BarcodeScannerModal from "@/components/nutrition/BarcodeScannerModal";
import MenuScanModal, { type MenuScanResult } from "@/components/nutrition/MenuScanModal";
import ManualModal from "@/components/nutrition/ManualModal";

type Vue = { nom: "accueil" } | { nom: "journee" } | { nom: "collection"; id: IdCollection };
type Fiche = { liste: Recipe[]; index: number; besoins: DayNeeds | null };
type LoggedMeal = { name: string; calories: number; proteins: number; carbs: number; fats: number };

const MOMENT_PHRASE: Record<MealType, string> = {
  "petit-dejeuner": "petit-déjeuner", "dejeuner": "déjeuner", "gouter": "goûter", "diner": "dîner",
};

/** Le régime déclaré sur l'appareil (lu seulement une fois le compte connu). */
function lireRegime(uid: string | null): string[] {
  if (!uid) return [];
  try {
    const brut = localStorage.getItem(`vaiiya_diet_${uid}`);
    return brut ? JSON.parse(brut) : [];
  } catch { return []; }
}

export default function NutritionTab() {
  const { user, session } = useAuth();
  const { guide } = useGuideActif();
  const { open: ouvrirAssistant } = useAssistant();
  const { goals } = useNutritionGoals();
  const moment = useMomentRepas();
  const aujourdhui = useJourLocal();
  const uid = user?.id ?? null;
  const premiumDebloque = !!(user?.is_premium || user?.is_admin);
  const premierJour = session?.user?.created_at ? localDateStr(new Date(session.user.created_at)) : null;

  /* ── Les vues : l'écran, le détail de la journée, une collection ── */
  const [vue, setVue] = useState<Vue>({ nom: "accueil" });
  const [jourDetail, setJourDetail] = useState<string | null>(null);
  const scrollAvant = useRef(0);
  const ouvrirVue = (v: Vue) => {
    scrollAvant.current = window.scrollY;
    setVue(v);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };
  const fermerVue = useCallback(() => {
    setVue({ nom: "accueil" });
    requestAnimationFrame(() => window.scrollTo(0, scrollAvant.current));
  }, []);
  useRetourTelephone(vue.nom === "journee", "nutritionJournee", fermerVue);
  useRetourTelephone(vue.nom === "collection", "nutritionCollection", fermerVue);

  const jourAffiche = vue.nom === "journee" ? (jourDetail ?? aujourdhui) : aujourdhui;
  /* Un jour hors de la fenêtre gratuite ne se lit pas : on ne dit pas
     « aucun repas » d'une journée qui en a peut-être (lib/historique). */
  const debutHisto = debutHistorique(historiqueComplet(user));
  const masque = !!jourAffiche && !!debutHisto && jourAffiche < debutHisto;

  /* ── Le journal, gardé par jour : revenir du détail ne relit pas l'écran ── */
  const [journal, setJournal] = useState<Record<string, MealEntry[]>>({});
  const cleJour = (date: string) => `${uid}:${date}`;
  useEffect(() => {
    if (!uid || !jourAffiche || masque) return;
    let annule = false;
    createClient().from("nutrition_logs").select("*")
      .eq("user_id", uid).eq("date", jourAffiche).order("time", { ascending: true })
      .then(({ data, error }) => {
        if (annule || error) return;
        setJournal((j) => ({ ...j, [`${uid}:${jourAffiche}`]: (data ?? []).map(ligneVersRepas) }));
      });
    return () => { annule = true; };
  }, [uid, jourAffiche, masque]);
  const repasAffiches = jourAffiche ? journal[cleJour(jourAffiche)] ?? null : null;
  const repasDuJour = aujourdhui ? journal[cleJour(aujourdhui)] ?? null : null;
  const totauxDuJour = useMemo(() => {
    const l = repasDuJour ?? [];
    return {
      calories: l.reduce((t, m) => t + (m.calories || 0), 0),
      proteins: l.reduce((t, m) => t + (m.proteins || 0), 0),
      carbs: l.reduce((t, m) => t + (m.carbs || 0), 0),
      fats: l.reduce((t, m) => t + (m.fats || 0), 0),
    };
  }, [repasDuJour]);

  /* ── Les derniers repas (fréquence, puis récence) et les épinglés ── */
  const [recents, setRecents] = useState<RecentMeal[]>([]);
  const [versionRecents, setVersionRecents] = useState(0);
  useEffect(() => {
    if (!uid) return;
    let annule = false;
    createClient().from("nutrition_logs").select("food_name, calories, proteins, carbs, fats")
      .eq("user_id", uid).order("date", { ascending: false }).order("time", { ascending: false }).limit(200)
      .then(({ data }) => { if (!annule && data) setRecents(classerRecents(data)); });
    return () => { annule = true; };
  }, [uid, versionRecents]);
  const { epingles, estEpingle, basculer, indiceVu } = useEpinglesRepas(uid);
  const derniersRepas = useMemo(() => {
    const cles = new Set(epingles.map((p) => nomComparable(p.name)));
    return [...epingles, ...recents.filter((r) => !cles.has(nomComparable(r.name)))].slice(0, Math.max(8, epingles.length));
  }, [epingles, recents]);

  /* ── Le message du bas ── */
  const [toast, setToast] = useState<string | null>(null);
  const minuteurToast = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montrer = useCallback((msg: string) => {
    setToast(msg);
    if (minuteurToast.current) clearTimeout(minuteurToast.current);
    minuteurToast.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /* ── Les modales d'ajout, et où elles écrivent ── */
  const [cible, setCible] = useState<{ date: string; type?: MealType }>({ date: "" });
  const [showPhoto, setShowPhoto] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showMenu, setShowMenu] = useState(false);   // « La carte » du resto en photo → classement
  const [menuResult, setMenuResult] = useState<MenuScanResult | null>(null);  // gardé : retour photo → carte sans relire
  const [photoFromMenu, setPhotoFromMenu] = useState(false);
  const [objectifCarte, setObjectifCarte] = useState<{ ligne: string; puce: string; connu: boolean } | null>(null);
  const [ajout, setAjout] = useState<{ type: MealType; date: string } | null>(null);

  const jourDuJour = () => aujourdhui ?? localDateStr();
  const dateDeCible = () => cible.date || jourDuJour();
  const ouvrirModale = (quoi: "photo" | "codebarres" | "ecrire", type?: MealType, date?: string) => {
    setCible({ date: date ?? jourDuJour(), type });
    if (quoi === "photo") { setPhotoFromMenu(false); setShowPhoto(true); }
    else if (quoi === "codebarres") setShowBarcode(true);
    else setShowManual(true);
  };
  const ouvrirAjout = (type?: MealType, date?: string) =>
    setAjout({ type: type ?? moment ?? momentActuel(), date: date ?? jourAffiche ?? jourDuJour() });

  /* « Noter un repas » depuis l'accueil arrive avec `?ajouter=repas` et ouvre
     DIRECTEMENT la saisie (choix de Louis, 2026-09-22). L'adresse se nettoie
     aussitôt : un retour arrière ne rouvre pas une feuille qu'on a fermée. La
     saisie s'ouvre à la première image, pas dans le corps de l'effet. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ajouter") !== "repas") return;
    params.delete("ajouter");
    const reste = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (reste ? `?${reste}` : ""));
    requestAnimationFrame(() => { setCible({ date: localDateStr() }); setShowManual(true); });
  }, []);

  const ouvrirCarte = () => {
    // Objectif du moment (données RÉELLES du jour, pas une estimation du plat).
    const connu = goals.calories > 0;
    const repas = MOMENT_PHRASE[moment ?? momentActuel()];
    const majuscule = repas.charAt(0).toUpperCase() + repas.slice(1);
    const regime = lireRegime(uid);
    const regimeTexte = regime.length ? ` Régime/contraintes à respecter : ${regime.join(", ")}.` : "";
    const reste = connu ? Math.max(0, Math.round(goals.calories - totauxDuJour.calories)) : 0;
    const proteinesReste = connu ? Math.max(0, Math.round(goals.proteins - totauxDuJour.proteins)) : 0;
    setObjectifCarte({
      connu,
      ligne: connu
        ? `Repas : ${repas}. Il reste environ ${reste} kcal sur la journée et ~${proteinesReste} g de protéines à couvrir.${regimeTexte}`
        : `Repas : ${repas}. Objectif calorique inconnu, privilégie un plat équilibré et un bon apport en protéines.${regimeTexte}`,
      puce: connu ? `${majuscule} · ~${reste} kcal restantes` : `${majuscule} · équilibre`,
    });
    setCible({ date: jourDuJour() });
    setMenuResult(null);
    setPhotoFromMenu(false);
    setShowMenu(true);
  };

  // Anti-triche : pas de repas daté dans le futur (sinon on gonflerait son EXP).
  const bloquerSiFutur = (date: string) => {
    if (date > localDateStr()) { montrer("On ne peut pas ajouter un repas dans le futur."); return true; }
    return false;
  };

  /* Un repas écrit entre dans le journal du jour qu'il concerne, et les
     derniers repas se relisent. */
  const accueillir = (date: string, m: MealEntry) => {
    setJournal((j) => {
      const cle = cleJour(date);
      if (!j[cle]) return j;
      return { ...j, [cle]: [...j[cle], m].sort((a, b) => a.time.localeCompare(b.time)) };
    });
    setVersionRecents((v) => v + 1);
  };

  /* ── Les six écritures du journal ── */
  const handleAddPhoto = async (meal: NouveauRepas) => {
    const date = dateDeCible();
    if (!uid) { montrer("Connecte-toi pour garder tes repas."); return; }
    if (bloquerSiFutur(date)) return;
    const { data, error } = await createClient().from("nutrition_logs").insert({
      user_id: uid, date, meal_type: meal.mealType,
      food_name: meal.name, description: meal.description ?? null,
      calories: meal.calories, proteins: meal.proteins, carbs: meal.carbs,
      fats: meal.fats, has_photo: meal.hasPhoto ?? false, time: meal.time,
    }).select().single();
    if (!error && data) { accueillir(date, ligneVersRepas(data)); signalerRepas(); montrer(`${meal.name} ajouté, ${meal.calories} kcal`); }
    else montrer("Le repas n’a pas pu être ajouté. Réessaie.");
    setShowPhoto(false);
    setPhotoFromMenu(false);
  };

  const handleAddBarcode = async (meal: NouveauRepas) => {
    const date = dateDeCible();
    if (!uid) { montrer("Connecte-toi pour garder tes repas."); return; }
    if (bloquerSiFutur(date)) return;
    const { data, error } = await createClient().from("nutrition_logs").insert({
      user_id: uid, date, meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { accueillir(date, ligneVersRepas(data)); signalerRepas(); montrer(`${meal.name} ajouté`); }
    else montrer("Le repas n’a pas pu être ajouté. Réessaie.");
    setShowBarcode(false);
  };

  const handleAddManual = async (meal: NouveauRepas) => {
    const date = dateDeCible();
    if (!uid) { montrer("Connecte-toi pour garder tes repas."); return; }
    if (bloquerSiFutur(date)) return;
    const { data, error } = await createClient().from("nutrition_logs").insert({
      user_id: uid, date, meal_type: meal.mealType,
      food_name: meal.name, calories: meal.calories, proteins: meal.proteins,
      carbs: meal.carbs, fats: meal.fats, has_photo: false, time: meal.time,
    }).select().single();
    if (!error && data) { accueillir(date, ligneVersRepas(data)); signalerRepas(); montrer(`${meal.name} ajouté`); }
    else montrer("Le repas n’a pas pu être ajouté. Réessaie.");
    setShowManual(false);
  };

  /** Un dernier repas, remis en un geste. Rend l'identifiant écrit (pour pouvoir le retirer). */
  const quickAddRecent = async (r: RecentMeal, type: MealType | undefined, date: string): Promise<string | null> => {
    if (!uid) { montrer("Connecte-toi pour garder tes repas."); return null; }
    if (bloquerSiFutur(date)) return null;
    const { data, error } = await createClient().from("nutrition_logs").insert({
      user_id: uid, date, meal_type: type ?? momentActuel(),
      food_name: r.name, calories: r.calories, proteins: r.proteins,
      carbs: r.carbs, fats: r.fats, has_photo: false, time: heureMaintenant(),
    }).select().single();
    if (!error && data) { accueillir(date, ligneVersRepas(data)); signalerRepas(); montrer(`${r.name} ajouté`); return String(data.id); }
    montrer("Le repas n’a pas pu être ajouté. Réessaie.");
    return null;
  };

  /** Une recette (banque, restes, livraison) ajoutée à la journée. */
  const addRecipeMeal = async (m: LoggedMeal, date: string) => {
    if (!uid) { montrer("Connecte-toi pour garder tes repas."); return; }
    if (bloquerSiFutur(date)) return;
    const { data, error } = await createClient().from("nutrition_logs").insert({
      user_id: uid, date, meal_type: momentActuel(),
      food_name: m.name, calories: m.calories, proteins: m.proteins,
      carbs: m.carbs, fats: m.fats, has_photo: false, time: heureMaintenant(),
    }).select().single();
    if (!error && data) { accueillir(date, ligneVersRepas(data)); signalerRepas(); montrer(`${m.name} ajouté`); }
    else montrer("Le repas n’a pas pu être ajouté. Réessaie.");
  };

  const deleteMeal = async (id: string, date: string) => {
    const { error } = await createClient().from("nutrition_logs").delete().eq("id", id);
    if (error) { montrer("Le repas n’a pas pu être retiré. Réessaie."); return; }
    setJournal((j) => {
      const cle = cleJour(date);
      return j[cle] ? { ...j, [cle]: j[cle].filter((m) => m.id !== id) } : j;
    });
    setVersionRecents((v) => v + 1);
    signalerRepas();
    montrer("Repas retiré");
  };

  /* ── Les idées et les collections ── */
  const regime = useMemo(() => regimeConnu(lireRegime(uid)), [uid]);
  const besoins = useMemo<DayNeeds | null>(() => {
    if (!moment) return null;
    return besoinsDuJour({
      moment,
      objectif: goals,
      mange: totauxDuJour,
      dejaManges: (repasDuJour ?? []).map((m) => m.name),
      aimes: (uid ? loadTasteProfileLocal(uid)?.bases : null) ?? [],
    });
  }, [moment, goals, totauxDuJour, repasDuJour, uid]);
  const idees = useMemo(
    () => (besoins && moment && aujourdhui ? ideesDuMoment({ moment, regime, besoins, graine: `${aujourdhui}:${moment}` }) : []),
    [besoins, moment, aujourdhui, regime],
  );
  const collections = useMemo(() => COLLECTIONS.filter((c) => recettesDe(c.id, regime).length > 0), [regime]);

  /* Une seule fiche recette pour tout l'écran. Les besoins du jour ne
     servent qu'aux idées : une collection se parcourt, elle ne se classe pas. */
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const ouvrirRecette = (r: Recipe, liste: Recipe[], avecBesoins: boolean) =>
    setFiche({ liste, index: Math.max(0, liste.findIndex((x) => x.id === r.id)), besoins: avecBesoins ? besoins : null });
  const recetteOuverte = fiche ? fiche.liste[fiche.index] : null;

  const allerComprendre = () => {
    fermerVue();
    setTimeout(() => document.getElementById("nutrition-comprendre")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const titre = (
    <h1 className="text-[34px] leading-none" style={{ color: "var(--text-1)", fontWeight: 800, fontVariationSettings: "var(--w-voix)" }}>
      <em className="not-italic" style={{
        background: "var(--degrade-titre)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        fontStyle: "italic",
        display: "inline-block", paddingRight: "0.14em",  // évite que l'italique coupe le « n » final
      }}>
        Nutrition
      </em>
    </h1>
  );

  return (
    <div className="min-h-screen px-4 pt-7 pb-36 md:pl-24 md:pr-8 md:pt-10 md:pb-10">
      <WeighInPrompt />
      <TastePrefsPrompt />

      {vue.nom === "accueil" && (
        <div className="flex max-w-[560px] flex-col gap-7 lg:max-w-5xl">
          {titre}
          {/* ⚠️ `grid-cols-1` et pas `grid` seul : sans colonne déclarée, la
              piste prend la largeur des photos (700 px) et la carte sort de l'écran. */}
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-5">
              <MealSituationHero
                userId={uid}
                moment={moment}
                goals={goals}
                consumed={totauxDuJour}
                eatenToday={(repasDuJour ?? []).map((m) => m.name)}
                onPhoto={() => ouvrirModale("photo")}
                onBarcode={() => ouvrirModale("codebarres")}
                onMenuScan={ouvrirCarte}
                classics={derniersRepas}
                onQuickAdd={(r) => { void quickAddRecent(r, undefined, jourDuJour()); }}
                onLogIdea={(m) => { void addRecipeMeal(m, jourDuJour()); }}
              />
              <CarteAujourdhui
                repas={repasDuJour}
                onDetail={() => { setJourDetail(aujourdhui); ouvrirVue({ nom: "journee" }); }}
                onAjouter={() => ouvrirAjout(undefined, jourDuJour())}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-7">
              {moment && (
                <IdeesDuMoment key={moment} moment={moment} recettes={idees}
                  onOuvrir={(r, liste) => ouvrirRecette(r, liste, true)} />
              )}
              <TrouverRecette
                collections={collections}
                onCollection={(id) => ouvrirVue({ nom: "collection", id })}
                onRecette={(r) => ouvrirRecette(r, [r], false)}
              />
              <ComprendreNutrition premiumDebloque={premiumDebloque} />
            </div>
          </div>
        </div>
      )}

      {vue.nom === "journee" && jourAffiche && aujourdhui && (
        <div className="max-w-[560px]">
          <JourneeNutrition
            date={jourAffiche}
            aujourdhui={aujourdhui}
            premierJour={premierJour}
            repas={repasAffiches}
            masque={masque}
            objectifs={goals}
            onRetour={fermerVue}
            onDate={setJourDetail}
            onAjouter={(type) => ouvrirAjout(type, jourAffiche)}
            onRetirer={(id) => { void deleteMeal(id, jourAffiche); }}
            onComprendre={allerComprendre}
          />
        </div>
      )}

      {vue.nom === "collection" && (
        <div className="max-w-[560px]">
          <CollectionRecettes
            id={vue.id}
            recettes={recettesDe(vue.id, regime)}
            guide={guide}
            onRetour={fermerVue}
            onOuvrir={(r, liste) => ouvrirRecette(r, liste, false)}
            onDemander={() => ouvrirAssistant(DEMANDE_AU_GUIDE[vue.id])}
          />
        </div>
      )}

      {/* ── La feuille d'ajout, les modales, la fiche recette, le message ── */}
      <AnimatePresence>
        {ajout && aujourdhui && (
          <FeuilleAjoutRepas
            key="ajout"
            typeInitial={ajout.type}
            date={ajout.date}
            aujourdhui={aujourdhui}
            recents={derniersRepas}
            estEpingle={estEpingle}
            indiceVu={indiceVu}
            onFermer={() => setAjout(null)}
            onPhoto={(type) => { const d = ajout.date; setAjout(null); ouvrirModale("photo", type, d); }}
            onCodeBarres={(type) => { const d = ajout.date; setAjout(null); ouvrirModale("codebarres", type, d); }}
            onEcrire={(type) => { const d = ajout.date; setAjout(null); ouvrirModale("ecrire", type, d); }}
            onAjouterRecent={(r, type) => quickAddRecent(r, type, ajout.date)}
            onRetirer={(id) => deleteMeal(id, ajout.date)}
            onEpingler={(r) => { const epingle = basculer(r); montrer(epingle ? `${r.name} épinglé` : `${r.name} n’est plus épinglé`); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBarcode && (
          <BarcodeScannerModal key="barcode" typeInitial={cible.type} onClose={() => setShowBarcode(false)} onAdd={handleAddBarcode} />
        )}
        {showPhoto && (
          <PhotoAnalysisModal key="photo"
            typeInitial={cible.type}
            onClose={() => { setShowPhoto(false); setPhotoFromMenu(false); }}
            onAdd={handleAddPhoto}
            onBack={photoFromMenu ? () => { setShowPhoto(false); setPhotoFromMenu(false); setShowMenu(true); } : undefined}
          />
        )}
        {showManual && (
          <ManualModal key="manual" typeInitial={cible.type} onClose={() => setShowManual(false)} onAdd={handleAddManual} />
        )}
        {showMenu && objectifCarte && (
          <MenuScanModal key="menu"
            objectiveLine={objectifCarte.ligne} objectiveChip={objectifCarte.puce} goalKnown={objectifCarte.connu}
            initialResult={menuResult} onResult={setMenuResult}
            onClose={() => setShowMenu(false)}
            onPickDish={(name) => {
              // Le classement reste en cache : la photo pourra revenir dessus.
              setShowMenu(false);
              setPhotoFromMenu(true);
              montrer(`« ${name} » : prends ton assiette en photo quand elle arrive.`);
              setShowPhoto(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fiche && recetteOuverte && (
          <RecipeSheet
            key="recette"
            recipe={recetteOuverte}
            fitNote={fiche.besoins ? fitReason(recetteOuverte, fiche.besoins) : null}
            onClose={() => setFiche(null)}
            onLog={(m) => { void addRecipeMeal(m, jourDuJour()); setFiche(null); }}
            onOther={fiche.liste.length > 1 ? () => setFiche((f) => (f ? { ...f, index: (f.index + 1) % f.liste.length } : f)) : undefined}
            hasOther={fiche.liste.length > 1}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl flex items-center gap-2"
            style={{
              background: "rgba(var(--surface-rgb),0.92)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(var(--surface-rgb),0.9)",
              boxShadow: "var(--ombre-flottant)",
              maxWidth: "calc(100vw - 32px)",
            }}>
            <Check size={14} strokeWidth={2.5} className="flex-shrink-0" style={{ color: "var(--teal-encre)" }} />
            <span className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
