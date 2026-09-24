import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listerAvisApprouves } from "@/lib/avisPublics";
import FormAvis from "@/components/avis/FormAvis";

/* ════════════════════════════════════════════════════════════════════
   /avis — les avis PUBLICS sur Vaiiya.

   Composant SERVEUR : la liste des avis approuvés et la moyenne sont rendues
   dans le HTML, donc lisibles par un visiteur non connecté ET par Google
   (preuve sociale + contenu indexable). Seule la zone d'écriture (`FormAvis`)
   est un îlot client, parce qu'elle a besoin de la session.

   La page se relit toutes les 5 minutes (`revalidate`) au lieu de frapper la
   base à chaque visite.
   ════════════════════════════════════════════════════════════════════ */

export const revalidate = 300;

export const metadata: Metadata = {
  // Le gabarit racine ajoute « · Vaiiya ».
  title: "Avis des membres",
  description:
    "Ce que les membres pensent de Vaiiya, l'application web française d'entraînement et de nutrition avec assistant IA. Avis publics, laissés par de vrais utilisateurs.",
  alternates: { canonical: "https://vaiiya.fr/avis" },
};

/* Étoiles en lecture, côté serveur (pas d'interaction). */
function Etoiles({ note, taille = 15 }: { note: number; taille?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const plein = n <= note;
        return (
          <svg key={n} width={taille} height={taille} viewBox="0 0 24 24" aria-hidden
            style={{ color: plein ? "var(--gold)" : "rgba(var(--accent-rgb),0.22)" }}
            fill={plein ? "var(--gold)" : "transparent"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
            <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45-4.7-4.6 6.5-.95z" />
          </svg>
        );
      })}
    </span>
  );
}

export default async function AvisPage() {
  const avis = await listerAvisApprouves();
  const total = avis.length;
  const moyenne = total > 0 ? avis.reduce((s, a) => s + a.note, 0) / total : 0;

  return (
    <div className="min-h-screen px-4 pt-4 pb-28 max-w-2xl mx-auto" style={{ background: "var(--page-bg)" }}>
      <Link href="/"
        className="flex items-center gap-1.5 mb-3 text-[13px] font-semibold bg-transparent border-none"
        style={{ color: "var(--text-3)" }}>
        <ChevronLeft size={14} strokeWidth={2.5} /> Retour
      </Link>

      <h1 className="text-[26px] font-extralight tracking-tight" style={{ color: "var(--text-1)" }}>
        Vos{" "}
        <em className="not-italic font-light" style={{
          background: "linear-gradient(135deg,var(--accent),var(--gold))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic",
          display: "inline-block", paddingRight: "0.14em",
        }}>avis</em>
      </h1>

      {total > 0 && (
        <div className="flex items-center gap-3 mt-2 mb-5">
          <b className="vy-nombre text-[26px]" style={{ color: "var(--text-1)" }}>{moyenne.toFixed(1)}</b>
          <Etoiles note={Math.round(moyenne)} taille={16} />
          <small style={{ color: "var(--text-3)" }}>{total} avis</small>
        </div>
      )}

      {/* Zone d'écriture (îlot client). */}
      <FormAvis />

      {/* La liste des avis approuvés (rendue côté serveur). */}
      {total === 0 && (
        <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Aucun avis pour l’instant. Sois le premier.</p>
      )}
      <ul className="flex flex-col gap-3">
        {avis.map((a) => (
          <li key={a.id} className="rounded-2xl p-4"
            style={{ background: "rgba(var(--surface-rgb),0.9)", border: "1px solid rgba(var(--accent-rgb),0.10)" }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt="" width={30} height={30} className="rounded-full object-cover w-[30px] h-[30px]" />
              ) : (
                <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#8B5CF6 0%,#C13BC1 100%)" }}>{a.pseudo.charAt(0).toUpperCase()}</span>
              )}
              <b className="text-[14px] font-semibold flex-1 truncate" style={{ color: "var(--text-1)" }}>{a.pseudo}</b>
              <Etoiles note={a.note} taille={14} />
            </div>
            {a.texte.trim() && (
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-2)" }}>{a.texte}</p>
            )}
            <p className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>
              {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
