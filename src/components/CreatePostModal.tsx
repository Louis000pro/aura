"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, Send, Upload, Globe, Users, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  suggestedTags?: string[];
};

type Audience = "public" | "friends" | "private";

export default function CreatePostModal({ onClose, onSuccess, suggestedTags = [] }: Props) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [audience, setAudience] = useState<Audience>("public");
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_CHARS = 500;
  const remaining = MAX_CHARS - caption.length;
  const canSubmit = (caption.trim().length > 0 || mediaFile) && remaining >= 0 && !submitting;

  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) { setError("Seules les images et vidéos sont acceptées"); return; }
    if (file.size > 500 * 1024 * 1024) { setError("Fichier trop lourd (max 500 Mo)"); return; }
    setError(null);
    setMediaFile(file);
    setMediaKind(isVideo ? "video" : "image");
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []); // eslint-disable-line

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    const supabase = createClient();
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // Upload du fichier si présent
    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop() ?? (mediaKind === "video" ? "mp4" : "jpg");
      const path = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

      setUploadProgress(20);
      const { data, error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, mediaFile, { upsert: false, contentType: mediaFile.type });

      if (uploadErr) {
        console.error("post media upload:", uploadErr);
        setError("L'envoi du média a échoué, réessaie");
        setSubmitting(false);
        return;
      }
      setUploadProgress(70);

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
      mediaUrl = urlData.publicUrl;
      mediaType = mediaKind ?? "image";
    }

    setUploadProgress(85);

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      type: "day",
      caption: caption.trim() || null,
      description: description.trim() || null,
      audience,
      performance_data: {},
      media_url: mediaUrl,
      media_type: mediaType,
    });

    setUploadProgress(100);
    setSubmitting(false);

    if (insertError) {
      console.error("post insert:", insertError);
      setError("La publication a échoué, réessaie");
      return;
    }

    onSuccess();
    onClose();
  };

  const audienceOptions: { key: Audience; label: string; icon: typeof Globe }[] = [
    { key: "public",  label: "Public",  icon: Globe },
    { key: "friends", label: "Amis",    icon: Users },
    { key: "private", label: "Privé",   icon: Lock  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: "rgba(var(--tint-violet-rgb),0.85)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 flex flex-col gap-4"
        style={{
          background: "rgba(var(--surface-rgb),0.96)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(var(--surface-rgb),0.9)",
          boxShadow: "0 24px 64px rgba(var(--accent-rgb),0.18), inset 0 1px 0 rgba(var(--surface-rgb),0.9)",
          maxHeight: "90dvh",
          overflowY: "auto",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-light" style={{ color: "var(--text-1)" }}>Nouveau post</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(var(--tint-violet-rgb),0.8)" }}>
            <X size={14} strokeWidth={2} style={{ color: "var(--text-3)" }} />
          </motion.button>
        </div>

        {/* Author */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold"
              style={{ background: user.avatar ? "transparent" : "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)" }}>
              {user.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" decoding="async" src={user.avatar} alt={user.pseudo} className="w-full h-full object-cover" />
                : user.pseudo?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--text-1)" }}>{user.name || user.pseudo}</p>
              <p className="text-xs font-light mt-0.5" style={{ color: "var(--text-3)" }}>@{user.pseudo}</p>
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="relative rounded-2xl"
          style={{ background: "rgba(var(--tint-violet-rgb),0.45)", border: "1px solid rgba(var(--violet-mid-rgb),0.4)" }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Quoi de neuf ? Partage ta progression, une pensée, une victoire…"
            rows={4}
            maxLength={MAX_CHARS}
            className="w-full bg-transparent text-sm outline-none px-4 pt-3 pb-7 rounded-2xl resize-none placeholder:font-light"
            style={{ color: "var(--text-1)" }}
            autoFocus
          />
          <span className="absolute bottom-2.5 right-3 text-[11px] font-medium select-none"
            style={{ color: remaining <= 30 ? (remaining < 0 ? "#FC8181" : "var(--gold)") : "#C4C9D4" }}>
            {remaining}
          </span>
        </div>

        {/* Description (optionnelle) */}
        <div className="relative rounded-2xl"
          style={{ background: "rgba(var(--tint-violet-rgb),0.3)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description, #hashtags, contexte… (optionnel)"
            rows={2}
            maxLength={800}
            className="w-full bg-transparent text-sm outline-none px-4 pt-3 pb-3 rounded-2xl resize-none placeholder:font-light"
            style={{ color: "var(--text-1)" }}
          />
        </div>

        {/* Suggested hashtags */}
        {suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.slice(0, 8).map((tag) => (
              <motion.button
                key={tag}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setCaption((prev) => {
                  const sep = prev && !prev.endsWith(" ") ? " " : "";
                  // Avoid duplicates
                  if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
                  return `${prev}${sep}${tag}`;
                })}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer"
                style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", border: "1px solid rgba(var(--accent-rgb),0.2)" }}
              >
                {tag}
              </motion.button>
            ))}
          </div>
        )}

        {/* Media zone */}
        <AnimatePresence mode="wait">
          {!mediaPreview ? (
            <motion.div
              key="drop-zone"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="relative rounded-2xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all"
              style={{
                background: dragging ? "rgba(var(--accent-rgb),0.1)" : "rgba(var(--tint-violet-rgb),0.4)",
                border: `2px dashed ${dragging ? "var(--accent)" : "rgba(var(--accent-rgb),0.3)"}`,
              }}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,var(--violet-mid),#F0E6FF)" }}>
                  <Image size={18} strokeWidth={1.5} style={{ color: "#7C5CFA" }} />
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#FDE68A,var(--cream-mid))" }}>
                  <Video size={18} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                  {dragging ? "Dépose ici !" : "Ajoute une photo ou vidéo"}
                </p>
                <p className="text-xs mt-0.5 font-light" style={{ color: "var(--text-3)" }}>
                  Glisse-dépose ou clique · JPG, PNG, MP4, MOV · max 500 Mo
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: "rgba(var(--accent-rgb),0.12)" }}>
                <Upload size={12} strokeWidth={2} style={{ color: "var(--accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Choisir un fichier</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="relative rounded-2xl overflow-hidden"
              style={{ background: "#000", maxHeight: 280 }}>
              {mediaKind === "video"
                ? <video src={mediaPreview} className="w-full object-cover" style={{ maxHeight: 280 }} controls muted playsInline />
                // eslint-disable-next-line @next/next/no-img-element
                : <img loading="lazy" decoding="async" src={mediaPreview} alt="aperçu" className="w-full object-cover" style={{ maxHeight: 280 }} />
              }
              {/* Remove button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={removeMedia}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                <X size={14} strokeWidth={2.5} style={{ color: "white" }} />
              </motion.button>
              {/* File info badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg flex items-center gap-1.5"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                {mediaKind === "video"
                  ? <Video size={11} strokeWidth={2} style={{ color: "rgba(255,255,255,0.8)" }} />
                  : <Image size={11} strokeWidth={2} style={{ color: "rgba(255,255,255,0.8)" }} />
                }
                <span className="text-[10px] font-medium text-white/80 truncate max-w-[140px]">
                  {mediaFile?.name}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audience */}
        <div className="flex gap-1.5">
          {audienceOptions.map(({ key, label, icon: Icon }) => (
            <motion.button key={key} whileTap={{ scale: 0.95 }}
              onClick={() => setAudience(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={audience === key
                ? { background: "linear-gradient(135deg,var(--violet-mid),var(--cream-mid))", color: "var(--text-1)", boxShadow: "inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
                : { background: "rgba(var(--tint-violet-rgb),0.5)", color: "var(--text-3)", border: "1px solid rgba(var(--violet-mid-rgb),0.3)" }
              }
            >
              <Icon size={11} strokeWidth={2} />
              {label}
            </motion.button>
          ))}
        </div>

        {/* Upload progress bar */}
        <AnimatePresence>
          {submitting && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(var(--accent-rgb),0.15)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,var(--accent),var(--cream-mid))" }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-center mt-1 font-light" style={{ color: "var(--text-3)" }}>
                {uploadProgress < 70 ? "Upload en cours…" : uploadProgress < 90 ? "Finalisation…" : "Publication…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && <p className="text-xs px-1" style={{ color: "#FC8181" }}>{error}</p>}

        {/* Submit */}
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          whileHover={{ scale: canSubmit ? 1.01 : 1 }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          style={canSubmit
            ? { background: "linear-gradient(135deg,var(--violet-mid) 0%,var(--cream-mid) 100%)", color: "var(--text-1)", boxShadow: "0 4px 16px rgba(var(--accent-rgb),0.25), inset 0 1px 0 rgba(var(--surface-rgb),0.8)" }
            : { background: "rgba(var(--tint-violet-rgb),0.6)", color: "var(--text-3)", cursor: "not-allowed" }
          }
        >
          {submitting
            ? <motion.div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(45,55,72,0.2)", borderTopColor: "var(--text-1)" }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
            : <><Send size={14} strokeWidth={2} />Publier</>
          }
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
