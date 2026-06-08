import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Charger .env.local manuellement ──
const env = {};
readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("env manquant");

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Personas coach (comptes officiels) ──
const COACHES = [
  { pseudo: "marie.coach", full_name: "Marie · Coach", email: "marie.coach@vaiiya.app", color: "A78BFA" },
  { pseudo: "max.fit",     full_name: "Max · Coach",   email: "max.fit@vaiiya.app",     color: "FFB088" },
  { pseudo: "lea.yoga",    full_name: "Léa · Yoga",    email: "lea.yoga@vaiiya.app",    color: "7C6BAA" },
  { pseudo: "tom.force",   full_name: "Tom · Force",   email: "tom.force@vaiiya.app",   color: "C4A8FF" },
];

const avatar = (c) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name.split(" ")[0])}&background=${c.color}&color=fff&bold=true&size=256`;

// ── Vidéos (fichier local -> caption) ──
const VIDEOS = [
  { file: "8402114.mp4", caption: "Routine abdos à la maison 🔥 #abs #core #fitness", views: 18420 },
  { file: "8436000.mp4", caption: "Full body sans matériel 💪 #workout #homegym", views: 9230 },
  { file: "6326791.mp4", caption: "Mobilité du matin 🧘 #yoga #stretching #mobilité", views: 27110 },
  { file: "4686178.mp4", caption: "Gainage 3 minutes ⏱️ #core #challenge", views: 14005 },
  { file: "8809978.mp4", caption: "Souplesse & équilibre 🧘 #yoga #flexibilité", views: 6320 },
  { file: "4384247.mp4", caption: "Séance pecs en salle 💪 #musculation #gym", views: 31240 },
  { file: "4367576.mp4", caption: "Push day complet 🔥 #musculation #pushday", views: 12880 },
  { file: "6053511.mp4", caption: "Deadlift focus 🏋️ #force #powerlifting", views: 22410 },
  { file: "6115673.mp4", caption: "Squat technique parfaite 🏋️ #force #legs", views: 17650 },
  { file: "6115853.mp4", caption: "Pull day dos & biceps 💪 #musculation #dos", views: 8940 },
  { file: "16220914.mp4", caption: "Cardio HIIT express ⚡ #hiit #cardio", views: 19330 },
  { file: "18573510.mp4", caption: "Échauffement complet avant séance 🔥 #warmup #fitness", views: 5410 },
];

async function ensureCoach(c) {
  // Profil déjà présent ?
  const { data: existing } = await admin.from("profiles").select("id").eq("pseudo", c.pseudo).maybeSingle();
  if (existing) return existing.id;

  // Créer le user auth
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: c.email,
    email_confirm: true,
    password: "Vaiiya!" + Math.random().toString(36).slice(2, 10),
    user_metadata: { pseudo: c.pseudo, full_name: c.full_name },
  });
  if (cErr && !created?.user) {
    // user existe peut-être déjà -> le retrouver
    const { data: list } = await admin.auth.admin.listUsers();
    const found = list?.users?.find((u) => u.email === c.email);
    if (!found) throw cErr;
    created.user = found;
  }
  const id = created.user.id;

  // Créer le profil
  const { error: pErr } = await admin.from("profiles").insert({
    id,
    pseudo: c.pseudo,
    full_name: c.full_name,
    avatar_url: avatar(c),
    email: c.email,
    is_admin: true,
  });
  if (pErr && pErr.code !== "23505") throw pErr;
  return id;
}

async function main() {
  console.log("→ Création des comptes coach…");
  const coachIds = [];
  for (const c of COACHES) {
    const id = await ensureCoach(c);
    coachIds.push(id);
    console.log("  ✓", c.pseudo, id);
  }

  // Garde-fou anti-doublon : si ces coachs ont déjà des posts, on arrête.
  const { count } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .in("user_id", coachIds);
  if (count && count > 0) {
    console.log(`⚠️  ${count} posts existent déjà pour ces comptes — seed déjà fait, on arrête.`);
    return;
  }

  console.log("→ Upload + insertion des vidéos…");
  let i = 0;
  for (const v of VIDEOS) {
    const path = join(__dirname, "..", "seed_videos", v.file);
    if (!existsSync(path)) { console.log("  ⚠ manquant:", v.file); continue; }
    const userId = coachIds[i % coachIds.length];
    const buf = readFileSync(path);
    const storagePath = `${userId}/posts/${Date.now()}-${v.file}`;

    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(storagePath, buf, { contentType: "video/mp4", upsert: false });
    if (upErr) { console.log("  ✗ upload", v.file, upErr.message); continue; }

    const { data: pub } = admin.storage.from("avatars").getPublicUrl(storagePath);

    const { error: insErr } = await admin.from("posts").insert({
      user_id: userId,
      type: "day",
      caption: v.caption,
      description: null,
      audience: "public",
      performance_data: {},
      media_url: pub.publicUrl,
      media_type: "video",
      views: v.views,
    });
    if (insErr) { console.log("  ✗ insert", v.file, insErr.message); continue; }
    console.log(`  ✓ ${v.file}  →  ${COACHES[i % COACHES.length].pseudo}  (${v.views} vues)`);
    i++;
  }
  console.log("✅ Seed terminé:", i, "vidéos publiées.");
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });
