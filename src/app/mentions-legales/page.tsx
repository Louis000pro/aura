"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import RetourLegal from "@/components/legal/RetourLegal";

/* ── Section block ──────────────────────────────────────── */
function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-semibold mb-2.5" style={{ color: "var(--text-0)" }}>{title}</h2>
      <div
        className="rounded-3xl px-5 py-5 text-sm font-light leading-relaxed space-y-2.5"
        style={{
          background: "rgba(var(--surface-rgb),0.7)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 12px rgba(var(--accent-rgb),0.05)",
          color: "var(--text-body)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-28 max-w-3xl mx-auto">
      <RetourLegal />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>Mentions légales</h1>
        <p className="text-sm font-light mt-1.5" style={{ color: "var(--text-3)" }}>
          Informations légales relatives au site et à l&apos;application Vaiiya.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>

        <LegalSection title="Éditeur du site">
          <p>
            Le site et l&apos;application <strong>Vaiiya</strong> sont édités à titre non professionnel
            par un particulier. Le service est proposé <strong>gratuitement</strong>{" "}: aucun abonnement
            n&apos;est en vente et aucun paiement n&apos;est encaissé.
          </p>
          <ul className="list-none space-y-1.5 mt-2">
            <li><strong>Contact :</strong> bonjour@vaiiya.fr</li>
          </ul>
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
            Conformément à l&apos;article 6 III 2 de la loi du 21 juin 2004 pour la confiance dans
            l&apos;économie numérique, un éditeur non professionnel peut ne pas rendre publiques ses
            coordonnées personnelles, à condition de les avoir communiquées à son hébergeur, qui les
            tient à disposition de l&apos;autorité judiciaire. Ces informations seront publiées ici dès
            l&apos;immatriculation de la structure qui exploitera le service.
          </p>
        </LegalSection>

        <LegalSection title="Directeur de la publication">
          <p>
            La direction de la publication est assurée par l&apos;éditeur du site, joignable à
            l&apos;adresse <strong>bonjour@vaiiya.fr</strong>.
          </p>
        </LegalSection>

        <LegalSection title="Hébergement">
          <p>Le site est hébergé par :</p>
          <ul className="list-none space-y-1.5 mt-2">
            <li><strong>Vercel Inc.</strong></li>
            <li>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
            <li>
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }} className="hover:underline">
                vercel.com
              </a>
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Propriété intellectuelle">
          <p>
            L&apos;ensemble des contenus présents sur le site et l&apos;application Vaiiya (structure, textes,
            graphismes, interface, logo, ainsi que la marque <strong>Vaiiya</strong>) sont la propriété
            exclusive de l&apos;éditeur ou de ses partenaires et sont protégés par les lois françaises et
            internationales relatives à la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, représentation, modification ou exploitation, totale ou partielle, de ces
            éléments, sans l&apos;autorisation écrite préalable de l&apos;éditeur, est strictement interdite et
            constitue une contrefaçon.
          </p>
          <p>
            Les utilisateurs <strong>conservent l&apos;intégralité des droits</strong>{" "}sur les contenus qu&apos;ils
            publient (affiches de performance, photos, messages, etc.). En publiant un contenu sur Vaiiya,
            l&apos;utilisateur accorde toutefois à l&apos;éditeur une licence non exclusive et gratuite d&apos;affichage
            et de diffusion de ce contenu, dans le seul but de faire fonctionner le service (affichage du
            profil, des conversations et des fonctionnalités associées).
          </p>
        </LegalSection>

        <LegalSection title="Responsabilité">
          <p>
            L&apos;éditeur s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur
            le site, mais ne saurait garantir l&apos;absence totale d&apos;erreurs ou d&apos;omissions.
          </p>
          <p>
            Les contenus, conseils sportifs et nutritionnels générés par l&apos;intelligence artificielle sont
            fournis à titre informatif et ne constituent en aucun cas un avis médical. Ils ne sauraient se
            substituer à l&apos;avis d&apos;un professionnel de santé. L&apos;utilisateur reste seul responsable de
            l&apos;usage qu&apos;il fait de ces informations.
          </p>
          <p>
            L&apos;éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de
            l&apos;utilisation du service, d&apos;une indisponibilité temporaire, ou des contenus publiés par les
            utilisateurs.
          </p>
        </LegalSection>

        <LegalSection title="Contact">
          <p>
            Pour toute question relative au site, à son fonctionnement ou aux présentes mentions légales,
            vous pouvez nous écrire à l&apos;adresse suivante :
            {/* À COMPLÉTER : adresse email de contact officielle */}
            {" "}<strong>bonjour@vaiiya.fr</strong>.
          </p>
          <p>
            Pour les questions relatives à vos données personnelles, consultez notre{" "}
            <Link href="/confidentialite" style={{ color: "var(--accent)" }} className="hover:underline">
              Politique de confidentialité
            </Link>.
          </p>
        </LegalSection>

        <p className="text-center text-[11px] font-light mt-8" style={{ color: "var(--text-3)" }}>
          Dernière mise à jour : 30 juillet 2026 · Vaiiya
        </p>
      </motion.div>
    </div>
  );
}
