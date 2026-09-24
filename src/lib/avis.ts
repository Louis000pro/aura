/* ════════════════════════════════════════════════════════════════════
   avis — accès CLIENT aux avis, sans interface.

   Un avis par personne (éditable), écrit par son auteur seulement (la RLS le
   tient). Depuis la modération (20260924_avis_moderation.sql), un avis n'est
   PUBLIC qu'une fois « approuve » ; toute écriture d'un non-admin retombe en
   « en_attente » (garde-fou par trigger). Le pseudo et l'avatar se lisent à
   côté dans `profiles`, comme partout — on ne les dénormalise pas.

   La lecture publique côté SERVEUR (landing, page /avis) vit dans
   `lib/avisPublics.ts`. Ici, c'est le côté navigateur : mon avis, le poser, le
   retirer, et la modération pour un admin connecté.
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@/lib/supabase";

export type Avis = {
  id: string;
  user_id: string;
  note: number;
  texte: string;
  created_at: string;
  statut: string;
  pseudo: string;
  avatar_url: string | null;
};

export type MonAvis = {
  id: string;
  user_id: string;
  note: number;
  texte: string;
  created_at: string;
  statut: string;
};

type Ligne = { id: string; user_id: string; note: number; texte: string; created_at: string; statut: string };

async function joindreProfils(
  supabase: ReturnType<typeof createClient>,
  lignes: Ligne[],
): Promise<Avis[]> {
  if (lignes.length === 0) return [];
  const ids = Array.from(new Set(lignes.map((l) => l.user_id)));
  const { data: profs } = await supabase
    .from("profiles").select("id, pseudo, avatar_url").in("id", ids);
  const parId = new Map<string, { pseudo?: string; avatar_url?: string | null }>();
  (profs ?? []).forEach((p: { id: string; pseudo?: string; avatar_url?: string | null }) => parId.set(p.id, p));
  return lignes.map((l) => ({
    ...l,
    pseudo: parId.get(l.user_id)?.pseudo ?? "Membre",
    avatar_url: parId.get(l.user_id)?.avatar_url ?? null,
  }));
}

/** Les avis APPROUVÉS, du plus récent au plus ancien. */
export async function chargerAvis(): Promise<Avis[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("avis")
    .select("id, user_id, note, texte, created_at, statut")
    .eq("statut", "approuve")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return joindreProfils(supabase, data as Ligne[]);
}

/** Mon avis (quel que soit son statut), ou null si je n'en ai pas encore laissé. */
export async function monAvis(userId: string): Promise<MonAvis | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("avis")
    .select("id, user_id, note, texte, created_at, statut")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as MonAvis) ?? null;
}

/**
 * Poser (ou remplacer) mon avis. Un seul par personne : upsert sur user_id.
 * Le trigger de modération force le statut à « en_attente » : inutile (et
 * impossible) de l'écrire ici.
 */
export async function poserAvis(userId: string, note: number, texte: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("avis")
    .upsert(
      { user_id: userId, note, texte: texte.trim().slice(0, 500), updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return !error;
}

/** Retirer mon avis. */
export async function supprimerAvis(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("avis").delete().eq("user_id", userId);
  return !error;
}

/* ─── Modération (admin connecté) ─────────────────────────────────────
   La RLS n'autorise ces lectures/écritures qu'à un compte `is_admin` : un
   non-admin qui appellerait ces fonctions ne verrait rien et n'écrirait rien. */

/** Les avis en attente de modération, du plus ancien au plus récent (file d'attente). */
export async function chargerAvisAModerer(): Promise<Avis[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("avis")
    .select("id, user_id, note, texte, created_at, statut")
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  return joindreProfils(supabase, data as Ligne[]);
}

/** Approuver ou rejeter un avis. */
export async function modererAvis(id: string, statut: "approuve" | "rejete"): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("avis").update({ statut }).eq("id", id);
  return !error;
}
