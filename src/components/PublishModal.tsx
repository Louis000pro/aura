"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2, Camera, ImageDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Mode = "post" | "story";

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("post");
  const [done, setDone] = useState<Mode | null>(null);

  /* ── Media state ── */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0); // 0→1 pendant l'upload
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const uploadMedia = async (): Promise<string | null> => {
    if (!file || !user) return null;
    const supabase = createClient();
    const ext = (file.name.split(".").pop() ?? (mediaType === "video" ? "mp4" : "jpg")).toLowerCase();
    const folder = mode === "story" ? "stories" : "posts";
    // Path MUST start with userId for RLS: (storage.foldername(name))[1] = auth.uid()
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    // ── Upload via XHR pour avoir une vraie progression (les vidéos sont lourdes) ──
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (base && anon && token) {
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${base}/storage/v1/object/avatars/${path}`);
          xhr.setRequestHeader("authorization", `Bearer ${token}`);
          xhr.setRequestHeader("apikey", anon);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.setRequestHeader("cache-control", "3600");
          if (file.type) xhr.setRequestHeader("content-type", file.type);
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(e.loaded / e.total); };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`upload ${xhr.status}`));
          xhr.onerror = () => reject(new Error("network"));
          xhr.send(file);
        });
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        console.warn("[PublishModal] xhr upload failed, fallback supabase-js:", e);
      }
    }

    // Fallback : upload classique supabase-js (sans progression)
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (upErr) {
      console.error("[PublishModal] upload error:", upErr);
      setError("L'envoi du média a échoué, réessaie");
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ── Publish ── */
  const publish = async () => {
    if (!file || !user) return;
    if (mode === "post" && !title.trim()) return;
    setPublishing(true);
    setProgress(0);
    setError(null);
    const url = await uploadMedia();
    if (!url) { setPublishing(false); return; }
    const supabase = createClient();

    if (mode === "story") {
      const { error: err } = await supabase.from("stories").insert({
        user_id: user.id,
        content_type: mediaType === "video" ? "video" : "photo",
        media_url: url,
        media_type: mediaType,
        caption: title.trim() || null,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      setPublishing(false);
      if (err) { console.error("publishStory:", err); setError("La publication a échoué, réessaie"); return; }
      setDone("story");
    } else {
      const { error: err } = await supabase.from("posts").insert({
        user_id: user.id,
        type: "day",
        caption: title.trim() || null,
        description: caption.trim() || null,
        media_url: url,
        media_type: mediaType,
        audience: "public",
        performance_data: {},
      });
      setPublishing(false);
      if (err) { console.error("publishPost:", err); setError("La publication a échoué, réessaie"); return; }
      setDone("post");
    }
  };

  const canPublish = !!file && !publishing && (mode === "story" || !!title.trim());
  const ACCENT = "#A78BFA";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: "rgba(20,10,40,0.72)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", bounce: 0.22, duration: 0.45 }}
        className="relative w-full md:max-w-md rounded-t-[32px] md:rounded-[28px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.98)",
          boxShadow: "0 -8px 60px rgba(167,139,250,0.2), 0 40px 80px rgba(0,0,0,0.3)",
          maxHeight: "92dvh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header : close + onglets Instagram ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="text-sm font-bold" style={{ color: "#1A202C" }}>
            {done ? "Publié !" : "Créer"}
          </span>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <X size={16} strokeWidth={2.5} style={{ color: "#718096" }} />
          </motion.button>
        </div>

        {!done && (
          /* Onglets segmentés (style Instagram) */
          <div className="px-5 pb-3">
            <div className="relative flex p-1 rounded-2xl" style={{ background: "rgba(167,139,250,0.08)" }}>
              {(["post", "story"] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className="relative flex-1 py-2 rounded-xl text-[13px] font-bold z-10 transition-colors"
                    style={{ color: active ? "#2D2150" : "#A0AEC0" }}
                  >
                    {active && (
                      <motion.div
                        layoutId="publish-tab"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "#fff", boxShadow: "0 2px 8px rgba(167,139,250,0.18)" }}
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span className="relative z-10">{m === "post" ? "Publication" : "Story"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-y-auto" style={{ maxHeight: "calc(92dvh - 130px)" }}>
          <AnimatePresence mode="wait">

            {/* ── ÉDITION ── */}
            {!done && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="px-5 pb-7 flex flex-col gap-4"
              >
                {/* Zone média */}
                <div
                  onClick={preview ? () => fileRef.current?.click() : undefined}
                  className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center${preview ? " cursor-pointer" : ""}`}
                  style={preview ? {
                    aspectRatio: mode === "story" ? "9/16" : "1/1",
                    maxHeight: mode === "story" ? 360 : undefined,
                    background: "#000",
                  } : {
                    background: "rgba(167,139,250,0.05)",
                    border: "2px dashed rgba(167,139,250,0.25)",
                    padding: "28px 16px",
                  }}
                >
                  {preview ? (
                    mediaType === "video"
                      ? <video src={preview} className="w-full h-full object-cover" muted playsInline />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img loading="lazy" decoding="async" src={preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 px-6 w-full">
                      <div className="flex gap-3 w-full">
                        {/* Prendre une photo / vidéo */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                          className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl"
                          style={{ background: "#fff", border: "1.5px solid rgba(167,139,250,0.2)", boxShadow: "0 2px 10px rgba(167,139,250,0.08)" }}
                        >
                          <Camera size={26} strokeWidth={1.6} style={{ color: ACCENT }} />
                          <span className="text-xs font-semibold" style={{ color: "#6B5BA0" }}>Prendre une photo</span>
                        </button>
                        {/* Importer depuis la galerie */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                          className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl"
                          style={{ background: "#fff", border: "1.5px solid rgba(167,139,250,0.2)", boxShadow: "0 2px 10px rgba(167,139,250,0.08)" }}
                        >
                          <ImageDown size={26} strokeWidth={1.6} style={{ color: ACCENT }} />
                          <span className="text-xs font-semibold" style={{ color: "#6B5BA0" }}>Importer</span>
                        </button>
                      </div>
                      <p className="text-[11px]" style={{ color: "#A0AEC0" }}>Photo ou vidéo</p>
                    </div>
                  )}
                  {preview && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.4)" }}>
                      <p className="text-white text-sm font-semibold">Changer</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileSelect} />

                {/* Titre */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#718096", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {mode === "post" ? "Titre *" : "Titre (optionnel)"}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={mode === "post" ? "Ex: PR au squat 180kg 💪" : "Ex: Séance du matin 🔥"}
                    maxLength={80}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none"
                    style={{ background: "rgba(240,235,255,0.5)", border: "1.5px solid rgba(167,139,250,0.22)", color: "#2D3748" }}
                  />
                </div>

                {/* Description (publication uniquement) */}
                {mode === "post" && (
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#718096", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Description
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Raconte ton exploit, donne des détails…"
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none resize-none"
                      style={{ background: "rgba(240,235,255,0.5)", border: "1.5px solid rgba(167,139,250,0.22)", color: "#2D3748" }}
                    />
                    <p className="text-right text-xs mt-1" style={{ color: "#A0AEC0" }}>{caption.length}/500</p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={publish}
                  disabled={!canPublish}
                  className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide"
                  style={{
                    background: canPublish ? "linear-gradient(135deg,#A78BFA,#D4A843)" : "rgba(167,139,250,0.22)",
                    color: canPublish ? "#fff" : "rgba(167,139,250,0.6)",
                    boxShadow: canPublish ? "0 8px 24px rgba(167,139,250,0.32)" : "none",
                  }}
                >
                  {publishing
                    ? <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        {progress > 0 && progress < 1 ? `Envoi… ${Math.round(progress * 100)}%` : "Publication…"}
                      </span>
                    : mode === "post" ? "Publier" : "Publier la story"}
                </motion.button>

                {/* Barre de progression d'upload (rassure pour les vidéos lourdes) */}
                {publishing && progress > 0 && progress < 1 && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden -mt-2" style={{ background: "rgba(167,139,250,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg,#A78BFA,#D4A843)", transition: "width 0.2s ease" }} />
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SUCCÈS ── */}
            {done && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 px-8 py-12 text-center"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}>
                  <CheckCircle2 size={72} strokeWidth={1.3} style={{ color: ACCENT }} />
                </motion.div>
                <div>
                  <p className="text-2xl font-black tracking-tight" style={{ color: "#1A202C" }}>
                    {done === "story" ? "Story publiée ! 🔥" : "Publication en ligne ! 🏆"}
                  </p>
                  <p className="text-sm mt-2" style={{ color: "#718096" }}>
                    {done === "story"
                      ? "Visible sur ton profil et dans la communauté pendant 24h"
                      : "Visible sur ton profil et dans la communauté"}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="px-8 py-3.5 rounded-2xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#A78BFA,#D4A843)", color: "#fff", boxShadow: "0 6px 20px rgba(167,139,250,0.3)" }}
                >
                  Fermer
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
