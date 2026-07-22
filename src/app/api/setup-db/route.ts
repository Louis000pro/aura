import { NextResponse } from "next/server";

/**
 * ⚠️ ENDPOINT PRIVILÉGIÉ — exécute du SQL via la clé service-role.
 * VERROUILLÉ (fail-closed) : accès réservé au porteur du secret serveur
 * `SETUP_DB_SECRET` (jamais exposé au navigateur, jamais `NEXT_PUBLIC_*`).
 * Refuse si le secret n'est pas configuré, si l'en-tête est absent, ou si la
 * valeur ne correspond pas. Répond 404 pour ne pas révéler l'existence de
 * l'endpoint.
 *
 * DETTE TECHNIQUE (à traiter, cf. compte-rendu Lot 2) :
 *   - supprimer définitivement cet endpoint ;
 *   - retirer ses deux appels dans src/app/communaute/page.tsx ;
 *   - déplacer tout setup de schéma vers une migration SQL / un script interne.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.SETUP_DB_SECRET;
  if (!secret) return false; // fail-closed : pas de secret configuré → fermé
  const provided =
    req.headers.get("x-setup-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return provided.length > 0 && provided === secret;
}

const PROJECT_REF = "qbxcalnihiydvfjorhay";
const MGMT_TOKEN  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SQL = `
-- post_likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='Likes visibles par tous') THEN
    CREATE POLICY "Likes visibles par tous" ON public.post_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='Utilisateur peut liker') THEN
    CREATE POLICY "Utilisateur peut liker" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_likes' AND policyname='Utilisateur peut unliker') THEN
    CREATE POLICY "Utilisateur peut unliker" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- post_comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='Commentaires visibles par tous') THEN
    CREATE POLICY "Commentaires visibles par tous" ON public.post_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='Utilisateur peut commenter') THEN
    CREATE POLICY "Utilisateur peut commenter" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='Utilisateur peut supprimer son commentaire') THEN
    CREATE POLICY "Utilisateur peut supprimer son commentaire" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- post_reposts
CREATE TABLE IF NOT EXISTS public.post_reposts (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reposts' AND policyname='Reposts visibles par tous') THEN
    CREATE POLICY "Reposts visibles par tous" ON public.post_reposts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reposts' AND policyname='Utilisateur peut reposter') THEN
    CREATE POLICY "Utilisateur peut reposter" ON public.post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reposts' AND policyname='Utilisateur peut supprimer repost') THEN
    CREATE POLICY "Utilisateur peut supprimer repost" ON public.post_reposts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- parent_id pour les réponses aux commentaires
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- comment_likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_likes' AND policyname='Comment likes visibles') THEN
    CREATE POLICY "Comment likes visibles" ON public.comment_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_likes' AND policyname='Utilisateur peut liker commentaire') THEN
    CREATE POLICY "Utilisateur peut liker commentaire" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comment_likes' AND policyname='Utilisateur peut unliker commentaire') THEN
    CREATE POLICY "Utilisateur peut unliker commentaire" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_parent_id_idx ON public.post_comments(parent_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON public.post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_reposts_post_id_idx ON public.post_reposts(post_id);
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);
`;

export async function POST(req: Request) {
  if (!isAuthorized(req)) return new NextResponse(null, { status: 404 });

  // Méthode 1 : Supabase Management API (token de service)
  if (MGMT_TOKEN) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MGMT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: SQL }),
        }
      );
      if (res.ok) {
        return NextResponse.json({ ok: true, method: "management-api" });
      }
      const err = await res.text();
      console.warn("[setup-db] Management API failed:", res.status, err);
    } catch (e) {
      console.warn("[setup-db] Management API error:", e);
    }
  }

  // Méthode 2 : Supabase REST /pg/query (service role as bearer)
  if (SUPABASE_URL && MGMT_TOKEN) {
    try {
      const res = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MGMT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: SQL }),
      });
      if (res.ok) {
        return NextResponse.json({ ok: true, method: "pg-query" });
      }
    } catch {/* ignore */}
  }

  // Méthode 3 : RPC exec_sql si la fonction existe
  if (SUPABASE_URL && SERVICE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql_query: SQL }),
      });
      if (res.ok) {
        return NextResponse.json({ ok: true, method: "rpc" });
      }
    } catch {/* ignore */}
  }

  return NextResponse.json(
    { ok: false, message: "Toutes les méthodes ont échoué. Exécute le SQL manuellement dans Supabase Dashboard." },
    { status: 500 }
  );
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new NextResponse(null, { status: 404 });

  // Vérifie si post_comments existe
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ exists: false, error: "Config manquante" });
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/post_comments?limit=1`, {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    });
    if (res.ok) return NextResponse.json({ exists: true });
    if (res.status === 404 || res.status === 400) return NextResponse.json({ exists: false });
    return NextResponse.json({ exists: false, status: res.status });
  } catch (e) {
    return NextResponse.json({ exists: false, error: String(e) });
  }
}
