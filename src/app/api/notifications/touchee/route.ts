import { createAdminClient } from "@/lib/supabase-admin";
import { empreintePush } from "@/lib/journalPush";

/** Le service worker n'a pas la session du membre : preuve aléatoire propre à ce push. */
export async function POST(req: Request) {
  const vide = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (Number(req.headers.get("content-length") ?? 0) > 1024) return new Response(null, { status: 413 });
  try {
    const { id, token } = await req.json();
    if (typeof id !== "string" || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id) ||
      typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) return new Response(null, { status: 400 });
    await createAdminClient().from("journal_push").update({ touche_le: new Date().toISOString() })
      .eq("id", id).eq("token_hash", empreintePush(token)).is("touche_le", null)
      .gte("cree_le", new Date(Date.now() - 30 * 86400_000).toISOString());
  } catch { /* ne pas empêcher l'ouverture de l'app */ }
  return vide();
}
