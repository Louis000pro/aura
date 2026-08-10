"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Le bouton « Retour » des trois pages légales.
 *
 * Il pointait toujours vers `/parametres`. C'est juste pour un membre, qui
 * arrive de là. C'est faux pour tous les autres : ces trois pages sont
 * publiques, indexées, liées depuis le pied de page de chaque page vitrine, et
 * un visiteur venu d'un moteur de recherche se retrouvait projeté dans un écran
 * de réglages d'une application où il n'a même pas de compte.
 *
 * La destination suit donc d'où l'on vient réellement : les réglages pour un
 * membre, l'accueil public pour quelqu'un qui n'est pas connecté. Le libellé
 * change avec elle, parce qu'un bouton « Retour » qui emmène ailleurs que d'où
 * l'on vient ne veut rien dire.
 */
export default function RetourLegal() {
  const { user } = useAuth();
  const versApp = Boolean(user);

  return (
    <Link href={versApp ? "/parametres" : "/"}>
      <motion.div
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.96 }}
        className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl cursor-pointer"
        style={{
          background: "rgba(var(--surface-rgb),0.7)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 8px rgba(var(--accent-rgb),0.06)",
          color: "var(--text-2)",
        }}
      >
        <ArrowLeft size={15} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
        <span className="text-sm font-medium">{versApp ? "Retour" : "Accueil Vaiiya"}</span>
      </motion.div>
    </Link>
  );
}
