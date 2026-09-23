/* ════════════════════════════════════════════════════════════════════
   avis — accès aux avis PUBLICS sur Vaiiya, sans interface.

   Un avis par personne (éditable), lisible par tous, écrit par son auteur
   seulement (la RLS le tient, cf. 20260923_avis.sql). Le pseudo et l'avatar
   se lisent à côté dans `profiles`, comme partout ailleurs — on ne les
   dénormalise pas dans la table, ils resteraient figés.
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@/lib/supabase";

export type Avis = {
  id: string;
  user_id: string;
  note: number;
  texte: string;
  created_at: string;
  pseudo: string;
  avatar_url: string | null;
};

type LigneAvis = { id: string; user_id: string; note: number; texte: string; created_at: string };

/** Tous les avis, du plus récent au plus ancien, pseudo/avatar joints. */
export async function chargerAvis(): Promise<Avis[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("avis")
    .select("id, user_id, note, texte, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const lignes = data as LigneAvis[];
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

/** Mon avis, ou null si je n'en ai pas encore laissé. */
export async function monAvis(userId: string): Promise<LigneAvis | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("avis")
    .select("id, user_id, note, texte, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as LigneAvis) ?? null;
}

/** Poser (ou remplacer) mon avis. Un seul par personne : on upsert sur user_id. */
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
