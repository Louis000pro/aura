"use client";

/* ─────────────────────────────────────────────────────────────
   Page publique d'invitation.

   C'est le seul écran de Vaiiya qu'un inconnu voit avant d'avoir
   un compte. Il ne doit rien expliquer de l'app : juste montrer
   l'affiche vide, dire qui invite, et donner une seule action.
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PosterDefi from "@/components/defi/PosterDefi";
import { apercuInvitation, rejoindreDefi, type Apercu } from "@/lib/defi";
import { refusRelais } from "@/lib/defiErreurs";

export default function RejoindrePage() {
  const params = useParams<{ code: string }>();
  const code   = (params?.code ?? "").toString().toUpperCase();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [apercu, setApercu]   = useState<Apercu | null>(null);
  const [charge, setCharge]   = useState(true);
  const [entree, setEntree]   = useState(false);
  const [erreur, setErreur]   = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    void apercuInvitation(code).then((a) => { setApercu(a); setCharge(false); });
  }, [code]);

  /* Déjà connecté : on entre directement, la page n'est qu'un passage. */
  const entrer = useCallback(async () => {
    setEntree(true);
    const r = await rejoindreDefi(code);
    // C'est le SEUL moment où quelqu'un arrive d'Internet dans Vaiiya : il
    // doit finir dans une conversation, pas devant une image. Le fil vient
    // de naître avec les deux dedans, l'affiche y est déjà épinglée et le
    // premier message est tout prêt.
    if (r.ok) {
      const fil = typeof r.conversation_id === "string" ? r.conversation_id : null;
      router.replace(fil ? `/communaute/${fil}` : "/defi");
      return;
    }
    setEntree(false);
    setErreur(refusRelais(r).texte);
  }, [code, router]);

  useEffect(() => {
    if (authLoading || charge) return;
    if (user && apercu?.valide && !apercu.complet) void entrer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, charge, user, apercu]);

  if (charge || authLoading) {
    return (
      <Ecran>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
        </div>
      </Ecran>
    );
  }

  if (!apercu?.valide) {
    return (
      <Ecran>
        <div className="mx-auto w-full max-w-[360px] pt-16 text-center">
          <h1 className="text-[24px] font-bold" style={{ color: "var(--text-0)" }}>
            Cette invitation n&apos;existe plus.
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--text-body)" }}>
            Elle a peut-être expiré, ou le lien est incomplet.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-2xl px-5 py-3 text-[15px] font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
          >
            Découvrir Vaiiya
          </button>
        </div>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <div className="mx-auto w-full max-w-[360px]">
        <PosterDefi serie="sillage" etat={1} titre="Sillage" className="shadow-2xl" />

        <div className="mt-7 flex items-center gap-3">
          {apercu.inviterAvatar ? (
            <Image
              src={apercu.inviterAvatar}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-[16px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {apercu.inviterNom.charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-[15px] leading-snug" style={{ color: "var(--text-body)" }}>
            <span className="font-semibold" style={{ color: "var(--text-0)" }}>{apercu.inviterNom}</span>
            {" "}t&apos;invite à un relais.
          </p>
        </div>

        <h1 className="mt-5 text-[26px] font-bold leading-tight" style={{ color: "var(--text-0)" }}>
          Cette affiche se dévoile à deux.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--text-body)" }}>
          Quatre jours de sport sur sept, chacun son tour, jamais deux jours de
          suite la même personne. À la fin de la semaine, l&apos;affiche est
          entière et elle est à vous deux.
        </p>

        {apercu.complet ? (
          <p className="mt-6 text-[15px] font-medium" style={{ color: "var(--text-2)" }}>
            L&apos;équipe est déjà complète.
          </p>
        ) : (
          <>
            <button
              onClick={() => (user ? entrer() : router.push(`/auth?next=/rejoindre/${code}`))}
              disabled={entree}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[16px] font-semibold text-white transition-transform active:scale-[.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)" }}
            >
              {entree ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              {user ? "Rejoindre le relais" : "Créer mon compte et rejoindre"}
            </button>
            <p className="mt-3 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
              Gratuit. Une séance de dix minutes suffit à franchir un jour.
            </p>
          </>
        )}

        {erreur && (
          <p className="mt-4 text-center text-[14px]" style={{ color: "#E8620C" }}>{erreur}</p>
        )}
      </div>
    </Ecran>
  );
}

function Ecran({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-5 pb-16 pt-10" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
      {children}
    </div>
  );
}
