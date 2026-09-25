"use client";

/**
 * L'encart qui dit qu'un historique plus ancien EXISTE, qu'il est conservé,
 * et ce qui le rend visible. Un seul dessin pour tous les écrans : la même
 * petite bannière dorée que celle du coach quand les messages sont épuisés.
 *
 * ⚠️ Il ne dit jamais « effacé », « perdu » ni « supprimé » : c'est faux, et
 * les conditions promettent le contraire.
 */
import { useRouter } from "next/navigation";
import { PLANS, VENTE_OUVERTE } from "@/lib/plans";

export default function HistoriqueMasque({ className = "" }: { className?: string }) {
  const router = useRouter();
  const jours = PLANS.free.limits.historiqueJours;
  return (
    <button
      type="button"
      onClick={() => router.push("/premium")}
      className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] cursor-pointer text-left ${className}`}
      style={{ borderRadius: "var(--r-controle)", border: "1px solid rgba(var(--gold-rgb),0.45)", background: "rgba(var(--gold-rgb),0.07)" }}
      aria-label={`Tu vois tes ${jours} derniers jours. Ton historique plus ancien est conservé. Découvrir Vaiiya+`}
    >
      <span aria-hidden style={{ color: "var(--gold)" }}>✦</span>
      <span className="flex-1 min-w-0" style={{ color: "var(--text-2)" }}>
        Tu vois tes {jours} derniers jours. Le reste est conservé :{" "}
        <b className="font-extrabold" style={{ color: "var(--or-encre)" }}>Vaiiya+</b> le rend visible.
      </span>
      <span className="font-bold flex-shrink-0" style={{ color: "var(--or-encre)" }}>
        {VENTE_OUVERTE ? "Découvrir ›" : "Bientôt ›"}
      </span>
    </button>
  );
}
