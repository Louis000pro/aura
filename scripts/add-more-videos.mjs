import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, "..", ".vidtmp2");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const env = {};
readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
});
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36";
const rand = () => Math.random().toString(36).slice(2, 8);

// id Pexels -> {url, caption, views}
const VIDS = [
  { id: "8809586", url: "https://videos.pexels.com/video-files/8809586/8809586-hd_1080_1920_24fps.mp4", caption: "Routine gainage à la maison 🔥 #core #homeworkout", views: 11200 },
  { id: "9001924", url: "https://videos.pexels.com/video-files/9001924/9001924-hd_1080_1920_25fps.mp4", caption: "Étirements du soir 🧘 #stretching #mobilité", views: 8700 },
  { id: "4487994", url: "https://videos.pexels.com/video-files/4487994/4487994-hd_1080_1920_25fps.mp4", caption: "Squats poids du corps 🦵 #legday #fitness", views: 19400 },
  { id: "8308609", url: "https://videos.pexels.com/video-files/8308609/8308609-hd_1080_1920_25fps.mp4", caption: "Yoga flow matinal 🧘 #yoga #flow", views: 15300 },
  { id: "6296151", url: "https://videos.pexels.com/video-files/6296151/6296151-hd_1080_1920_25fps.mp4", caption: "Équilibre & souplesse 🤸 #yoga #balance", views: 6100 },
  { id: "8480261", url: "https://videos.pexels.com/video-files/8480261/8480261-hd_1080_1920_25fps.mp4", caption: "Posture du guerrier 🧘 #yoga #force", views: 9900 },
  { id: "6448030", url: "https://videos.pexels.com/video-files/6448030/6448030-hd_1080_1920_25fps.mp4", caption: "Respiration & détente 🌬️ #yoga #breath", views: 7400 },
  { id: "6446268", url: "https://videos.pexels.com/video-files/6446268/6446268-hd_1080_1920_25fps.mp4", caption: "Salutation au soleil ☀️ #yoga #morning", views: 12800 },
  { id: "6326719", url: "https://videos.pexels.com/video-files/6326719/6326719-hd_1920_1080_25fps.mp4", caption: "Abdos intenses 🔥 #abs #core", views: 24500 },
  { id: "8480625", url: "https://videos.pexels.com/video-files/8480625/8480625-hd_1920_1080_25fps.mp4", caption: "Séance yoga complète 🧘 #yoga #wellness", views: 10100 },
  { id: "4535143", url: "https://videos.pexels.com/video-files/4535143/4535143-hd_1920_1080_25fps.mp4", caption: "Renforcement profond 💪 #strength #pilates", views: 13600 },
  { id: "4536545", url: "https://videos.pexels.com/video-files/4536545/4536545-hd_1920_1080_30fps.mp4", caption: "Pilates au sol 🤸 #pilates #core", views: 8300 },
];

async function main() {
  const { data: coaches, error } = await admin
    .from("profiles")
    .select("id, pseudo")
    .in("pseudo", ["marie.coach", "max.fit", "lea.yoga", "tom.force"]);
  if (error || !coaches?.length) throw error || new Error("coachs introuvables");
  const ids = coaches.map((c) => c.id);
  console.log("Coachs:", coaches.map((c) => c.pseudo).join(", "));

  let i = 0, done = 0;
  for (const v of VIDS) {
    try {
      const res = await fetch(v.url, { headers: { "User-Agent": UA } });
      if (!res.ok) { console.log("  ✗ dl", v.id, res.status); continue; }
      const inPath = join(TMP, `${v.id}.in.mp4`);
      writeFileSync(inPath, Buffer.from(await res.arrayBuffer()));

      const outPath = join(TMP, `${v.id}.out.mp4`);
      execFileSync("ffmpeg", [
        "-y", "-i", inPath,
        "-vf", "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-profile:v", "high", "-level", "4.0",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-pix_fmt", "yuv420p", outPath,
      ], { stdio: "ignore" });

      const posterPath = join(TMP, `${v.id}.jpg`);
      execFileSync("ffmpeg", [
        "-y", "-i", outPath, "-ss", "0", "-vframes", "1",
        "-vf", "scale='min(720,iw)':'min(720,ih)':force_original_aspect_ratio=decrease", "-q:v", "4", posterPath,
      ], { stdio: "ignore" });

      const userId = ids[i % ids.length];
      const base = `${userId}/posts/seed2-${Date.now()}-${rand()}`;
      const up1 = await admin.storage.from("avatars").upload(`${base}.mp4`, readFileSync(outPath), { contentType: "video/mp4", upsert: false });
      if (up1.error) { console.log("  ✗ up vid", v.id, up1.error.message); continue; }
      const up2 = await admin.storage.from("avatars").upload(`${base}.jpg`, readFileSync(posterPath), { contentType: "image/jpeg", upsert: false });
      if (up2.error) { console.log("  ✗ up poster", v.id, up2.error.message); continue; }

      const vidUrl = admin.storage.from("avatars").getPublicUrl(`${base}.mp4`).data.publicUrl;
      const posterUrl = admin.storage.from("avatars").getPublicUrl(`${base}.jpg`).data.publicUrl;

      const { error: insErr } = await admin.from("posts").insert({
        user_id: userId, type: "day", caption: v.caption, description: null,
        audience: "public", performance_data: { poster: posterUrl, optimized: true },
        media_url: vidUrl, media_type: "video", views: v.views,
      });
      if (insErr) { console.log("  ✗ insert", v.id, insErr.message); continue; }
      console.log(`  ✓ ${v.id} → ${coaches[i % ids.length].pseudo} (${Math.round(readFileSync(outPath).length/1024)}KB)`);
      i++; done++;
    } catch (e) { console.log("  ✗ err", v.id, String(e).slice(0, 100)); }
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`✅ ${done}/${VIDS.length} vidéos ajoutées`);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
