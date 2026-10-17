"use client";

/* ════════════════════════════════════════════════════════════════════
   L'ACCORD POUR LES DONNÉES DE SANTÉ, DEMANDÉ AUX COMPTES DÉJÀ INSCRITS
   (audit du 2026-10-17).

   Les nouveaux comptes le donnent dans le questionnaire (`/bienvenue`,
   étape « Ton corps »). Ceux qui étaient inscrits avant ne l'ont jamais
   vu : on le leur demande une fois, par une feuille sobre. « Plus tard »
   la referme pour la session ; elle revient à la suivante tant qu'aucun
   accord n'est enregistré.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { enregistrerConsentement, lireConsentement } from "@/lib/consentementSante";
import { lockBodyModal } from "@/lib/bodyModal";

const CLE_PLUS_TARD = "vaiiya:consentement-plus-tard";
const SANS_DEMANDE = ["/bienvenue", "/auth", "/rejoindre", "/confidentialite", "/conditions", "/mentions-legales"];

export default function DemandeConsentement() {
  const { user } = useAuth();
  const pathname = usePathname() ?? "/";
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const exclu = SANS_DEMANDE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!user?.id || exclu) return;
    try { if (sessionStorage.getItem(CLE_PLUS_TARD)) return; } catch { /* stockage bloqué */ }
    let annule = false;
    void lireConsentement().then((c) => { if (!annule && !c) setOuvert(true); });
    return () => { annule = true; };
  }, [user?.id, exclu]);

  useEffect(() => (ouvert ? lockBodyModal() : undefined), [ouvert]);

  if (!ouvert || exclu) return null;

  const plusTard = () => {
    try { sessionStorage.setItem(CLE_PLUS_TARD, "1"); } catch { /* stockage bloqué */ }
    setOuvert(false);
  };
  const accepter = async () => {
    setEnvoi(true);
    await enregistrerConsentement();
    setEnvoi(false);
    setOuvert(false);
  };

  return (
    <div className="fixed inset-0 z-[118] flex items-end md:items-center justify-center"
      style={{ background: "rgba(20,14,40,0.35)" }} role="dialog" aria-modal="true" aria-labelledby="consentement-titre">
      <div className="w-full max-w-md rounded-t-[var(--r-feuille)] md:rounded-[var(--r-feuille)] px-6 pt-6 pb-8"
        style={{ background: "rgb(var(--surface-rgb))", boxShadow: "var(--ombre-flottant)" }}>
        <h2 id="consentement-titre" className="vy-sous mb-2" style={{ color: "var(--text-0)" }}>
          Tes données de santé
        </h2>
        <p className="vy-corps mb-3" style={{ color: "var(--text-1)" }}>
          Pour personnaliser tes séances et tes repas, Vaiiya utilise ton poids, ta taille, ce que tu manges et ce que tu dis de ta santé à ton Guide.
          La loi nous demande ton accord explicite.
        </p>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-2)" }}>
          Tu peux le retirer à tout moment en coupant la mémoire de ton Guide ou en supprimant ton compte.{" "}
          <a href="/confidentialite#sante" style={{ color: "var(--exp-encre)", textDecoration: "underline" }}>En savoir plus</a>
        </p>
        <button type="button" onClick={accepter} disabled={envoi}
          className="w-full py-3.5 rounded-2xl text-[16px] font-semibold text-white cursor-pointer"
          style={{ background: "linear-gradient(100deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}>
          {envoi ? "Un instant…" : "J’accepte"}
        </button>
        <button type="button" onClick={plusTard}
          className="w-full mt-3 py-2 text-[13px] font-medium cursor-pointer bg-transparent border-none"
          style={{ color: "var(--text-3)" }}>
          Plus tard
        </button>
      </div>
    </div>
  );
}
