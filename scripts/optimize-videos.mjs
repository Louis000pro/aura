import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, "..", ".vidtmp");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const env = {};
readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rand = () => Math.random().toString(36).slice(2, 8);

async function main() {
  const { data: posts, error } = await admin
    .from("posts")
    .select("id,user_id,media_url,performance_data")
    .eq("media_type", "video");
  if (error) throw error;
  console.log(`→ ${posts.length} vidéos à optimiser`);

  let done = 0;
  for (const p of posts) {
    try {
      const pd = p.performance_data || {};
      if (pd.optimized) { console.log("  ⏭  déjà optimisé:", p.id); done++; continue; }

      // 1. Télécharger l'original
      const res = await fetch(p.media_url);
      if (!res.ok) { console.log("  ✗ download", p.id, res.status); continue; }
      const inPath = join(TMP, `${p.id}.in.mp4`);
      writeFileSync(inPath, Buffer.from(await res.arrayBuffer()));

      // 2. Ré-encoder : max 1280px, H264 CRF26, faststart (lecture avant fin DL)
      const outPath = join(TMP, `${p.id}.out.mp4`);
      execFileSync("ffmpeg", [
        "-y", "-i", inPath,
        "-vf", "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-profile:v", "high", "-level", "4.0",
        "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", "-pix_fmt", "yuv420p",
        outPath,
      ], { stdio: "ignore" });

      // 3. Poster (1ère frame)
      const posterPath = join(TMP, `${p.id}.jpg`);
      execFileSync("ffmpeg", [
        "-y", "-i", outPath, "-ss", "0", "-vframes", "1",
        "-vf", "scale='min(720,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
        "-q:v", "4", posterPath,
      ], { stdio: "ignore" });

      // 4. Upload (nouveaux chemins -> évite le cache CDN)
      const base = `${p.user_id}/posts/opt-${Date.now()}-${rand()}`;
      const vidBuf = readFileSync(outPath);
      const posterBuf = readFileSync(posterPath);

      const up1 = await admin.storage.from("avatars").upload(`${base}.mp4`, vidBuf, { contentType: "video/mp4", upsert: false });
      if (up1.error) { console.log("  ✗ up video", p.id, up1.error.message); continue; }
      const up2 = await admin.storage.from("avatars").upload(`${base}.jpg`, posterBuf, { contentType: "image/jpeg", upsert: false });
      if (up2.error) { console.log("  ✗ up poster", p.id, up2.error.message); continue; }

      const vidUrl = admin.storage.from("avatars").getPublicUrl(`${base}.mp4`).data.publicUrl;
      const posterUrl = admin.storage.from("avatars").getPublicUrl(`${base}.jpg`).data.publicUrl;

      // 5. MAJ DB
      const { error: uErr } = await admin.from("posts").update({
        media_url: vidUrl,
        performance_data: { ...pd, poster: posterUrl, optimized: true },
      }).eq("id", p.id);
      if (uErr) { console.log("  ✗ update", p.id, uErr.message); continue; }

      const oldKB = Math.round((await (await fetch(p.media_url)).arrayBuffer().catch(() => new ArrayBuffer(0))).byteLength / 1024);
      console.log(`  ✓ ${p.id}  ${oldKB}KB → ${Math.round(vidBuf.length / 1024)}KB  (+poster)`);
      done++;
    } catch (e) {
      console.log("  ✗ erreur", p.id, String(e).slice(0, 120));
    }
  }
  rmSync(TMP, { recursive: true, force: true });
  console.log(`✅ Terminé: ${done}/${posts.length} optimisées`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
