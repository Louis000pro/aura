"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Video, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Step = "choice" | "story" | "post" | "success";

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("choice");
  const [successType, setSuccessType] = useState<"story" | "post">("story");

  /* ── Media state ── */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetMedia = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setCaption("");
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const uploadMedia = async (): Promise<string | null> => {
    if (!file || !user) return null;
    const supabase = createClient();
    const ext = (file.name.split(".").pop() ?? (mediaType === "video" ? "mp4" : "jpg")).toLowerCase();
    const folder = step === "story" ? "stories" : "posts";
    // Path MUST start with userId for RLS: (storage.foldername(name))[1] = auth.uid()
    // Timestamp ensures uniqueness → no upsert needed (avoids needing UPDATE policy)
    const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (upErr) {
      console.error("[PublishModal] upload error:", upErr);
      setError("Erreur upload : " + upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  /* ── Publish Story ── */
  const publishStory = async () => {
    if (!file || !user) return;
    setPublishing(true);
    setError(null);
    const url = await uploadMedia();
    if (!url) { setPublishing(false); return; }
    const supabase = createClient();
    const { error: err } = await supabase.from("stories").insert({
      user_id: user.id,
      content_type: mediaType === "video" ? "video" : "photo",
      media_url: url,
      media_type: mediaType,
      caption: title.trim() || null,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    setPublishing(false);
    if (err) { setError(err.message); return; }
    setSuccessType("story");
    setStep("success");
  };

  /* ── Publish Post ── */
  const publishPost = async () => {
    if (!file || !user) return;
    setPublishing(true);
    setError(null);
    const url = await uploadMedia();
    if (!url) { setPublishing(false); return; }
    const supabase = createClient();
    const { error: err } = await supabase.from("posts").insert({
      user_id: user.id,
      type: "day",                          // seul type valide pour posts media
      caption: title.trim() || null,        // titre → caption (affiché en haut)
      description: caption.trim() || null,  // description → bio (affiché en bas)
      media_url: url,
      media_type: mediaType,
      audience: "public",
      performance_data: {},
    });
    setPublishing(false);
    if (err) { setError(err.message); return; }
    setSuccessType("post");
    setStep("success");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
      style={{ background: "rgba(20,10,40,0.72)", backdropFilter: "blur(20px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", bounce: 0.22, duration: 0.45 }}
        className="relative w-full md:max-w-md rounded-t-[32px] md:rounded-[28px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          boxShadow: "0 -8px 60px rgba(167,139,250,0.2), 0 40px 80px rgba(0,0,0,0.3)",
          maxHeight: "92dvh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            {step !== "choice" && step !== "success" && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => { setStep("choice"); resetMedia(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.1)" }}
              >
                <ChevronLeft size={16} strokeWidth={2} style={{ color: "#7C5CFA" }} />
              </motion.button>
            )}
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: "#1A202C" }}>
                {step === "choice" ? "Publier" : step === "story" ? "Nouvelle story" : step === "post" ? "Nouvelle publication" : "Publié !"}
              </h2>
              {step === "choice" && (
                <p className="text-xs" style={{ color: "#A0AEC0" }}>Choisis le type de contenu</p>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.06)" }}
          >
            <X size={16} strokeWidth={2.5} style={{ color: "#718096" }} />
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 4 }} />

        <div className="overflow-y-auto" style={{ maxHeight: "calc(92dvh - 80px)" }}>
          <AnimatePresence mode="wait">

            {/* ── CHOICE ── */}
            {step === "choice" && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6 flex flex-col gap-4"
              >
                {/* Story card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("story")}
                  className="relative overflow-hidden rounded-2xl p-5 text-left"
                  style={{
                    background: "linear-gradient(135deg, #1A0A35 0%, #3D2F6B 100%)",
                    boxShadow: "0 8px 32px rgba(124,92,250,0.3)",
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle, #C4A8FF, transparent)", transform: "translate(20%, -30%)" }} />
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(196,168,255,0.2)" }}>
                      <span className="text-2xl">📸</span>
                    </div>
                    <div>
                      <p className="font-black text-base text-white tracking-tight">Story</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Photo ou vidéo · Disparaît en 24h
                      </p>
                      <p className="text-xs mt-2" style={{ color: "rgba(196,168,255,0.8)" }}>
                        Visible sur ton profil et dans la communauté
                      </p>
                    </div>
                  </div>
                </motion.button>

                {/* Post card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("post")}
                  className="relative overflow-hidden rounded-2xl p-5 text-left"
                  style={{
                    background: "linear-gradient(135deg, #FFF8E7 0%, #FFF0F0 100%)",
                    border: "1.5px solid rgba(212,168,67,0.2)",
                    boxShadow: "0 4px 20px rgba(212,168,67,0.12)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(212,168,67,0.12)" }}>
                      <span className="text-2xl">🏆</span>
                    </div>
                    <div>
                      <p className="font-black text-base tracking-tight" style={{ color: "#1A202C" }}>Publication</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A0AEC0" }}>
                        Photo ou vidéo · Permanente sur ton profil
                      </p>
                      <p className="text-xs mt-2" style={{ color: "#D4A843" }}>
                        Titre + description · Visible de tous
                      </p>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {/* ── STORY ── */}
            {step === "story" && (
              <motion.div
                key="story"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="p-6 flex flex-col gap-5 pb-8"
              >
                {/* Upload zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: "9/16",
                    maxHeight: 340,
                    background: preview ? "black" : "linear-gradient(135deg,#1A0A35,#3D2F6B)",
                    border: preview ? "none" : "2px dashed rgba(196,168,255,0.3)",
                  }}
                >
                  {preview ? (
                    mediaType === "video"
                      ? <video src={preview} className="w-full h-full object-cover" muted playsInline />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(196,168,255,0.15)" }}>
                        <ImagePlus size={28} strokeWidth={1.4} style={{ color: "rgba(196,168,255,0.8)" }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Appuie pour ajouter
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Photo ou vidéo</p>
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

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#718096", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Titre (optionnel)
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Séance du matin 🔥"
                    maxLength={80}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none"
                    style={{
                      background: "rgba(240,235,255,0.5)",
                      border: "1.5px solid rgba(196,168,255,0.25)",
                      color: "#2D3748",
                    }}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={publishStory}
                  disabled={!file || publishing}
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide"
                  style={{
                    background: file && !publishing ? "linear-gradient(135deg,#C4A8FF,#A78BFA,#7C5CFA)" : "rgba(167,139,250,0.3)",
                    color: file && !publishing ? "white" : "rgba(167,139,250,0.6)",
                    boxShadow: file && !publishing ? "0 8px 24px rgba(124,92,250,0.35)" : "none",
                  }}
                >
                  {publishing
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Publication…</span>
                    : "Publier la story →"}
                </motion.button>
              </motion.div>
            )}

            {/* ── POST ── */}
            {step === "post" && (
              <motion.div
                key="post"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="p-6 flex flex-col gap-5 pb-8"
              >
                {/* Upload zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: "1/1",
                    background: preview ? "black" : "linear-gradient(135deg,#FFF8E7,#FFF0F0)",
                    border: preview ? "none" : "2px dashed rgba(212,168,67,0.3)",
                  }}
                >
                  {preview ? (
                    mediaType === "video"
                      ? <video src={preview} className="w-full h-full object-cover" muted playsInline />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(212,168,67,0.12)" }}>
                        <Video size={28} strokeWidth={1.4} style={{ color: "rgba(212,168,67,0.6)" }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "#A0AEC0" }}>Photo ou vidéo</p>
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

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#718096", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Titre *
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: PR au squat 180kg 💪"
                    maxLength={80}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none"
                    style={{
                      background: "rgba(255,248,230,0.7)",
                      border: "1.5px solid rgba(212,168,67,0.3)",
                      color: "#2D3748",
                    }}
                  />
                </div>

                {/* Caption */}
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
                    style={{
                      background: "rgba(255,248,230,0.7)",
                      border: "1.5px solid rgba(212,168,67,0.3)",
                      color: "#2D3748",
                    }}
                  />
                  <p className="text-right text-xs mt-1" style={{ color: "#A0AEC0" }}>{caption.length}/500</p>
                </div>

                {error && (
                  <p className="text-sm text-red-500 font-medium bg-red-50 rounded-xl px-4 py-2">{error}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={publishPost}
                  disabled={!file || !title.trim() || publishing}
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide"
                  style={{
                    background: file && title.trim() && !publishing
                      ? "linear-gradient(135deg,#F5E6A3,#D4A843)"
                      : "rgba(212,168,67,0.2)",
                    color: file && title.trim() && !publishing ? "#3D2F00" : "rgba(212,168,67,0.5)",
                    boxShadow: file && title.trim() && !publishing ? "0 8px 24px rgba(212,168,67,0.35)" : "none",
                  }}
                >
                  {publishing
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Publication…</span>
                    : "Publier →"}
                </motion.button>
              </motion.div>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 px-8 py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                >
                  <CheckCircle2 size={72} strokeWidth={1.3} style={{ color: successType === "story" ? "#A78BFA" : "#D4A843" }} />
                </motion.div>
                <div>
                  <p className="text-2xl font-black tracking-tight" style={{ color: "#1A202C" }}>
                    {successType === "story" ? "Story publiée ! 🔥" : "Publication en ligne ! 🏆"}
                  </p>
                  <p className="text-sm mt-2" style={{ color: "#718096" }}>
                    {successType === "story"
                      ? "Visible sur ton profil et dans la communauté pendant 24h"
                      : "Visible sur ton profil et dans la communauté"}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="px-8 py-3.5 rounded-2xl font-bold text-sm"
                  style={{
                    background: successType === "story"
                      ? "linear-gradient(135deg,#C4A8FF,#A78BFA)"
                      : "linear-gradient(135deg,#F5E6A3,#D4A843)",
                    color: successType === "story" ? "white" : "#3D2F00",
                    boxShadow: "0 6px 20px rgba(167,139,250,0.3)",
                  }}
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
