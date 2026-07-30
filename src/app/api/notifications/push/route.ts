/**
 * /api/notifications/push
 *
 * POST  — save a push subscription for a user
 * DELETE — remove a push subscription by endpoint
 * PUT   — send a push notification to all subscriptions of a user (internal use)
 */

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { compteAppelant, refusAuth } from "@/lib/apiAuth";

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:contact@aura.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── SQL to create push_subscriptions table (idempotent) ──────────────────────
const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON public.push_subscriptions USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function ensureTable() {
  const supabase = createAdminClient();
  // Quick check — if table exists, skip setup
  const { error: checkErr } = await supabase.from("push_subscriptions").select("id").limit(1);
  if (!checkErr) return;

  // Table doesn't exist — create it via Management API or pg/query
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const projectRef  = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] ?? "";

  if (projectRef && serviceKey) {
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: SETUP_SQL }),
    }).catch(() => {});
  }
}

// ── POST — save subscription ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Le compte vient du jeton. Avant, il venait du corps de la requête : on
    // pouvait donc enregistrer SON appareil sur le compte de quelqu'un
    // d'autre, et recevoir ses notifications (donc le contenu de ses messages).
    const appelant = await compteAppelant(req);
    if (!appelant) return refusAuth();

    const { subscription } = await req.json() as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    await ensureTable();

    const supabase = createAdminClient();
    await supabase.from("push_subscriptions").upsert({
      user_id: appelant.id,
      endpoint: subscription.endpoint,
      p256dh:   subscription.keys.p256dh,
      auth:     subscription.keys.auth,
    }, { onConflict: "endpoint" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// ── DELETE — remove subscription ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    // Même raison qu'au POST : sans jeton, on pouvait désabonner les autres.
    const appelant = await compteAppelant(req);
    if (!appelant) return refusAuth();

    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase.from("push_subscriptions").delete().match({ user_id: appelant.id, endpoint });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// ── PUT — send push notification to a user (internal server-to-server) ────────
export async function PUT(req: NextRequest) {
  try {
    // Require service-role authorization for internal calls
    const authHeader = req.headers.get("Authorization");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: "VAPID non configuré" }, { status: 500 });
    }

    const { user_id, title, body, url, icon } = await req.json() as {
      user_id: string;
      title: string;
      body: string;
      url?: string;
      icon?: string;
    };

    if (!user_id || !title || !body) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon:  icon  ?? "/icons/icon-192.png",
      url:   url   ?? "/",
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        ).catch(async (err: { statusCode?: number }) => {
          // 410 Gone → subscription expired, remove it
          if (err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().match({ endpoint: sub.endpoint });
          }
          throw err;
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
