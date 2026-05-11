"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Send } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreatePostModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_CHARS = 500;
  const remaining = MAX_CHARS - content.length;
  const canSubmit = content.trim().length > 0 && remaining >= 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(240,235,255,0.8)", backdropFilter: "blur(28px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-md rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.9)",
          boxShadow: "0 24px 64px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-light" style={{ color: "#2D3748" }}>
            Nouveau post
          </h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(240,235,255,0.8)" }}
            aria-label="Fermer"
          >
            <X size={14} strokeWidth={2} style={{ color: "#A0AEC0" }} />
          </motion.button>
        </div>

        {/* Author row */}
        {user && (
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden"
              style={{
                background: user.avatar
                  ? "transparent"
                  : "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                color: "#2D3748",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              {user.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt={user.pseudo} className="w-full h-full object-cover" />
                : user.pseudo?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "#2D3748" }}>
                {user.name || user.pseudo}
              </p>
              <p className="text-xs font-light mt-0.5" style={{ color: "#A0AEC0" }}>
                @{user.pseudo}
              </p>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div
          className="relative mb-3 rounded-2xl"
          style={{ background: "rgba(240,235,255,0.45)", border: "1px solid rgba(212,192,255,0.4)" }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Quoi de neuf ? Partage ta progression, une pensée, une victoire…"
            rows={5}
            maxLength={MAX_CHARS}
            className="w-full bg-transparent text-sm outline-none px-4 pt-3 pb-8 rounded-2xl resize-none placeholder:font-light"
            style={{ color: "#2D3748" }}
            autoFocus
          />
          {/* Char counter */}
          <span
            className="absolute bottom-2.5 right-3 text-[11px] font-medium select-none"
            style={{ color: remaining <= 30 ? (remaining < 0 ? "#FC8181" : "#D4A843") : "#C4C9D4" }}
          >
            {remaining}
          </span>
        </div>

        {/* Image URL toggle */}
        <div className="mb-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowImageInput((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium cursor-pointer px-3 py-1.5 rounded-xl transition-colors"
            style={{
              background: showImageInput ? "rgba(212,192,255,0.25)" : "rgba(240,235,255,0.6)",
              color: showImageInput ? "#7C3AED" : "#A0AEC0",
              border: "1px solid rgba(212,192,255,0.3)",
            }}
          >
            <Image size={13} strokeWidth={1.8} />
            {showImageInput ? "Masquer l'image" : "Ajouter une image"}
          </motion.button>

          <AnimatePresence>
            {showImageInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2"
              >
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemple.com/image.jpg"
                  className="w-full text-xs outline-none px-3 py-2.5 rounded-xl"
                  style={{
                    background: "rgba(240,235,255,0.5)",
                    border: "1px solid rgba(212,192,255,0.5)",
                    color: "#2D3748",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs mb-3 px-1" style={{ color: "#FC8181" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <motion.button
          whileTap={{ scale: canSubmit ? 0.97 : 1 }}
          whileHover={{ scale: canSubmit ? 1.01 : 1 }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          style={
            canSubmit
              ? {
                  background: "linear-gradient(135deg, #D4C0FF 0%, #F5E6A3 100%)",
                  color: "#2D3748",
                  boxShadow: "0 4px 16px rgba(167,139,250,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
                }
              : {
                  background: "rgba(240,235,255,0.6)",
                  color: "#A0AEC0",
                  cursor: "not-allowed",
                }
          }
        >
          {submitting ? (
            <motion.div
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: "rgba(45,55,72,0.2)", borderTopColor: "#2D3748" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <>
              <Send size={14} strokeWidth={2} />
              Publier
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
