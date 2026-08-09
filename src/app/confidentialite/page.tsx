"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

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

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-28 max-w-3xl mx-auto">
      {/* Back button */}
      <Link href="/parametres">
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
          <span className="text-sm font-medium">Retour</span>
        </motion.div>
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>Politique de confidentialité</h1>
        <p className="text-sm font-light mt-1.5" style={{ color: "var(--text-3)" }}>
          Comment Vaiiya collecte, utilise et protège vos données personnelles, conformément au RGPD.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>

        <LegalSection title="Responsable du traitement">
          <p>
            Le responsable du traitement des données est la micro-entreprise <strong>Vaiiya</strong>,
            éditrice de l&apos;application du même nom.
          </p>
          <p>
            Pour toute question relative au traitement de vos données personnelles, vous pouvez nous
            contacter à l&apos;adresse :
            {/* À COMPLÉTER : adresse email de contact officielle */}
            {" "}<strong>bonjour@vaiiya.fr</strong>.
          </p>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Les informations complètes sur l&apos;éditeur figurent dans les{" "}
            <Link href="/mentions-legales" style={{ color: "var(--accent)" }} className="hover:underline">
              Mentions légales
            </Link>.
          </p>
        </LegalSection>

        <LegalSection title="Données collectées">
          <p>Dans le cadre de l&apos;utilisation de Vaiiya, nous collectons les catégories de données suivantes :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Données d&apos;identification :</strong> adresse email, pseudo, nom complet, avatar (photo de profil).</li>
            <li><strong>Données de fitness et de nutrition :</strong> séances d&apos;entraînement, journaux de poids, journaux nutritionnels, statistiques quotidiennes.</li>
            <li><strong>Contenus partagés :</strong> affiches de performance publiées, relations d&apos;amitié, conversations et messages (texte et photos) échangés dans la messagerie.</li>
            <li><strong>Échanges avec l&apos;assistant :</strong> vos messages, et les informations que vous lui demandez de retenir.</li>
            <li><strong>Abonnements aux notifications push :</strong> identifiants techniques permettant l&apos;envoi de notifications.</li>
            <li><strong>Données d&apos;usage :</strong> informations techniques sur votre utilisation de l&apos;application (interactions, préférences d&apos;affichage).</li>
          </ul>
        </LegalSection>

        <LegalSection title="Finalités du traitement">
          <p>Vos données sont traitées pour les finalités suivantes :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Fournir et faire fonctionner le service (compte, suivi sportif et nutritionnel).</li>
            <li>Personnaliser le coaching assisté par intelligence artificielle selon votre profil et vos objectifs.</li>
            <li>Faire fonctionner la messagerie, les amis et les défis à deux.</li>
            <li>Gérer votre abonnement et la facturation lorsque vous souscrivez.</li>
            <li>Vous envoyer des notifications par email et notifications push.</li>
            <li>Assurer la sécurité, prévenir la fraude et les abus.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Base légale">
          <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Exécution du contrat :</strong> la fourniture du service conformément à nos Conditions Générales d&apos;Utilisation (CGU).</li>
            <li><strong>Consentement :</strong> l&apos;envoi de notifications (email et push), que vous pouvez retirer à tout moment.</li>
            <li><strong>Intérêt légitime :</strong> la sécurité de la plateforme et la prévention des abus.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Destinataires et sous-traitants">
          <p>
            Pour fournir le service, nous faisons appel à des prestataires techniques (sous-traitants au
            sens du RGPD) qui peuvent traiter certaines de vos données pour notre compte :
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Supabase</strong> (Supabase Inc.) — hébergement de la base de données, authentification et stockage des fichiers.</li>
            <li><strong>Vercel</strong> (Vercel Inc.) — hébergement de l&apos;application et mesure d&apos;audience anonyme.</li>
            <li><strong>Resend</strong> — envoi des emails transactionnels.</li>
            <li><strong>Stripe</strong> (Stripe Inc. et Stripe Payments Europe) — gestion des abonnements et des paiements. Stripe reçoit votre adresse email et vos données de paiement, que nous ne voyons jamais.</li>
            <li><strong>Mistral AI</strong> (société française) — assistant conversationnel, génération de séances, de recettes et de menus.</li>
            <li><strong>Groq</strong> (Groq Inc.) — analyse des photos de repas et de cartes de restaurant, estimation nutritionnelle, transcription de la dictée vocale.</li>
          </ul>
          <p className="mt-2">
            Les contenus que vous soumettez à ces fonctions (message, photo d&apos;assiette, enregistrement
            vocal) sont transmis au prestataire concerné le temps de produire la réponse. Ne leur confiez pas
            d&apos;information que vous ne souhaitez pas voir quitter votre appareil.
          </p>
          <p className="mt-2">
            Certains de ces prestataires sont situés en dehors de l&apos;Union européenne, notamment aux
            <strong> États-Unis</strong>. Dans ce cas, les transferts de données sont encadrés par des
            <strong> garanties appropriées</strong>{" "}(clauses contractuelles types de la Commission
            européenne ou mécanismes équivalents) afin d&apos;assurer un niveau de protection adéquat.
          </p>
          <p>Nous ne vendons jamais vos données personnelles à des tiers.</p>
        </LegalSection>

        <LegalSection title="Durée de conservation">
          <p>
            Vos données personnelles sont conservées <strong>tant que votre compte est actif</strong>.
          </p>
          <p>
            En cas de suppression de votre compte, vos données sont définitivement effacées de nos
            systèmes dans un délai maximum de <strong>30 jours</strong>, sous réserve des obligations
            légales de conservation éventuelles.
          </p>
        </LegalSection>

        <LegalSection title="Vos droits (RGPD)">
          <p>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Droit d&apos;accès</strong> à vos données personnelles.</li>
            <li><strong>Droit de rectification</strong> des données inexactes ou incomplètes.</li>
            <li><strong>Droit à l&apos;effacement</strong> (« droit à l&apos;oubli »).</li>
            <li><strong>Droit à la portabilité</strong> de vos données.</li>
            <li><strong>Droit d&apos;opposition</strong> au traitement.</li>
            <li><strong>Droit à la limitation</strong> du traitement.</li>
            <li><strong>Droit de retirer votre consentement</strong> à tout moment (par exemple pour les notifications).</li>
          </ul>
          <p className="mt-2">
            Vous pouvez exercer ces droits directement depuis vos <strong>Paramètres</strong> (notamment la
            suppression de compte) ou en nous écrivant à
            {/* À COMPLÉTER : adresse email de contact officielle */}
            {" "}<strong>bonjour@vaiiya.fr</strong>.
          </p>
        </LegalSection>

        <LegalSection title="Suppression de compte">
          <p>
            Vous pouvez supprimer votre compte à tout moment, directement depuis l&apos;application, via
            <strong> Paramètres → Supprimer mon compte</strong>.
          </p>
          <p>
            Cette action est irréversible : elle entraîne la suppression de l&apos;ensemble de vos données
            (profil, séances, contenus sociaux, messages) dans le délai indiqué ci-dessus.
          </p>
        </LegalSection>

        <LegalSection title="Cookies et stockage local">
          <p>
            Vaiiya <strong>n&apos;utilise aucun cookie publicitaire ni traceur tiers</strong> à des fins
            marketing.
          </p>
          <p>
            Nous utilisons uniquement le <strong>stockage local</strong> (localStorage) de votre navigateur
            pour les besoins strictement nécessaires au fonctionnement du service :
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>la préférence de <strong>thème</strong> (clair / sombre) ;</li>
            <li>l&apos;état de l&apos;<strong>onboarding</strong> (parcours d&apos;accueil) ;</li>
            <li>le <strong>jeton de session</strong> d&apos;authentification (Supabase Auth).</li>
          </ul>
        </LegalSection>

        <LegalSection title="Sécurité">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données, notamment :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>le <strong>chiffrement des données en transit</strong> (HTTPS / TLS) ;</li>
            <li>des règles de sécurité au niveau de la base de données (<strong>Row Level Security</strong> de Supabase) ;</li>
            <li>une authentification sécurisée et un contrôle d&apos;accès aux données.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Réclamation">
          <p>
            Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous avez
            le droit d&apos;introduire une réclamation auprès de la <strong>CNIL</strong>{" "}(Commission Nationale
            de l&apos;Informatique et des Libertés) :
            {" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }} className="hover:underline">
              cnil.fr
            </a>.
          </p>
        </LegalSection>

        <p className="text-center text-[11px] font-light mt-8" style={{ color: "var(--text-3)" }}>
          Dernière mise à jour : 30 juillet 2026 · Vaiiya
        </p>
      </motion.div>
    </div>
  );
}
