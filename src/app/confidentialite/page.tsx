"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import RetourLegal from "@/components/legal/RetourLegal";

/* ── Section block ──────────────────────────────────────── */
function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-[16px] font-semibold mb-2.5" style={{ color: "var(--text-0)" }}>{title}</h2>
      <div
        className="rounded-3xl px-5 py-5 text-[16px] font-light leading-relaxed space-y-2.5"
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
      <RetourLegal />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-[26px] font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>Politique de confidentialité</h1>
        <p className="text-[16px] font-light mt-1.5" style={{ color: "var(--text-3)" }}>
          Comment Vaiiya collecte, utilise et protège vos données personnelles, conformément au RGPD.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>

        <LegalSection title="Responsable du traitement">
          <p>
            Le responsable du traitement est l&apos;éditeur de Vaiiya, une personne physique qui édite
            l&apos;application à titre non professionnel. Son identité figure dans les{" "}
            <Link href="/mentions-legales" style={{ color: "var(--exp-encre)" }} className="underline">
              mentions légales
            </Link>.
          </p>
          <p>
            Pour toute question sur vos données : <strong>bonjour@vaiiya.fr</strong>. Nous répondons dans
            un délai d&apos;un mois au plus. Vaiiya n&apos;a pas de délégué à la protection des données
            (il n&apos;est pas obligatoire à cette échelle) : cette adresse en tient lieu.
          </p>
        </LegalSection>

        <LegalSection title="Données collectées">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Compte :</strong> adresse e-mail, pseudo, nom (si vous le donnez ou si vous vous connectez avec Google), photo de profil, bio, Guide choisi.</li>
            <li><strong>Questionnaire :</strong> âge, taille, poids, genre, objectifs, niveau, rythme d&apos;entraînement, lieu et matériel, nombre de repas, type d&apos;alimentation.</li>
            <li><strong>Suivi :</strong> séances et séries réalisées, planning, pesées, repas notés, recettes et plats mis en favori, série de jours, EXP et rang, badges.</li>
            <li><strong>Assistant (votre Guide) :</strong> vos messages, et ce qu&apos;il retient de vous d&apos;une conversation à l&apos;autre (préférences, matériel, objectifs, et ce que vous lui dites de votre santé).</li>
            <li><strong>Photos et voix :</strong> photos de repas et de cartes de restaurant envoyées pour analyse, enregistrements de dictée vocale.</li>
            <li><strong>Social :</strong> amis, conversations et messages (texte et photos), relais, affiches de séance.</li>
            <li><strong>Avis :</strong> la note et le texte que vous choisissez de nous laisser.</li>
            <li><strong>Technique :</strong> abonnements aux notifications push, compteurs d&apos;usage de l&apos;assistant, adresse IP (limitation des tentatives de connexion), journaux d&apos;erreurs.</li>
            <li><strong>Paiement (quand l&apos;abonnement sera ouvert) :</strong> identifiant client et état de l&apos;abonnement. Vos données bancaires sont traitées par Stripe ; nous ne les voyons jamais.</li>
          </ul>
        </LegalSection>

        <section id="sante" className="mb-7 scroll-mt-6">
          <h2 className="text-[16px] font-semibold mb-2.5" style={{ color: "var(--text-0)" }}>Vos données de santé</h2>
          <div className="rounded-3xl px-5 py-5 text-[16px] font-light leading-relaxed space-y-2.5"
            style={{ background: "rgba(var(--surface-rgb),0.7)", border: "1px solid rgba(var(--accent-rgb),0.12)", color: "var(--text-body)" }}>
            <p>
              Votre poids, votre taille, votre alimentation et ce que vous dites de votre santé à votre Guide
              sont des <strong>données de santé</strong>. Nous ne les traitons qu&apos;avec votre{" "}
              <strong>consentement explicite</strong> (article 9 du RGPD), donné par une case dédiée, et nous
              gardons la date et la version du texte accepté.
            </p>
            <p>
              Elles servent uniquement à personnaliser vos séances, vos repas et les conseils de votre Guide.
              Elles ne sont jamais vendues, ni utilisées pour de la publicité, ni montrées aux autres membres.
            </p>
            <p>
              Vous pouvez retirer votre accord à tout moment : en coupant la mémoire de votre Guide
              (Paramètres → « Ce que je retiens de toi »), en effaçant ce qu&apos;il a retenu, ou en supprimant
              votre compte. Le retrait ne remet pas en cause ce qui a été fait avant.
            </p>
            <p>
              Vaiiya n&apos;est pas un dispositif médical et ne pose aucun diagnostic. Vaiiya est réservé aux
              personnes de 15 ans et plus.
            </p>
          </div>
        </section>

        <LegalSection title="Finalités et bases légales">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Fournir le service</strong> (compte, suivi sportif et nutritionnel, messagerie, amis, relais) : exécution du contrat.</li>
            <li><strong>Personnaliser le coaching à partir de vos données de santé</strong> : votre consentement explicite.</li>
            <li><strong>Vous envoyer des notifications</strong> (push et e-mail) : votre consentement, retirable dans les Paramètres.</li>
            <li><strong>Sécurité et prévention des abus</strong> (limites d&apos;essais, journaux d&apos;erreurs) : intérêt légitime.</li>
            <li><strong>Mesure d&apos;audience anonyme</strong> : intérêt légitime, sans cookie et sans identification.</li>
            <li><strong>Facturation</strong>, quand l&apos;abonnement sera ouvert : exécution du contrat et obligation légale de conservation comptable.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Destinataires et sous-traitants">
          <p>Personne d&apos;autre ne voit vos données, à part ces prestataires techniques, chacun pour son rôle :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Supabase</strong> (Supabase Inc., États-Unis) : base de données, comptes et fichiers, hébergés en Europe (Zurich, Suisse).</li>
            <li><strong>Vercel</strong> (Vercel Inc., États-Unis) : hébergement de l&apos;application, mesure d&apos;audience et de performance anonymes, sans cookie.</li>
            <li><strong>Groq</strong> (Groq Inc., États-Unis) : réponses de l&apos;assistant, génération de séances et de recettes, analyse des photos de repas et de cartes de restaurant, dictée vocale.</li>
            <li><strong>Mistral AI</strong> (France) : même rôle que Groq pour l&apos;assistant, selon la disponibilité de l&apos;un ou de l&apos;autre.</li>
            <li><strong>Resend</strong> (Resend Inc., États-Unis) et <strong>Google</strong> (Gmail) : envoi des e-mails (codes de connexion, demandes d&apos;ami).</li>
            <li><strong>Google</strong> : connexion avec un compte Google, si vous la choisissez.</li>
            <li><strong>Services de notification</strong> de votre navigateur (Google, Apple, Mozilla) : acheminement des notifications push, si vous les activez.</li>
            <li><strong>YouTube</strong> (Google) : lecture d&apos;une vidéo de démonstration, seulement si vous appuyez dessus (mode sans cookie).</li>
            <li><strong>Stripe</strong> (Stripe Payments Europe, Irlande) : paiements, quand l&apos;abonnement sera ouvert.</li>
          </ul>
          <p className="mt-2">
            Le contenu que vous soumettez à l&apos;assistant (message, photo, enregistrement vocal) est envoyé
            au prestataire d&apos;intelligence artificielle le temps de produire la réponse.
          </p>
          <p className="mt-2">
            Pour les prestataires situés aux <strong>États-Unis</strong>, les transferts sont encadrés par les{" "}
            <strong>clauses contractuelles types</strong> de la Commission européenne prévues dans leurs
            conditions de traitement des données, ou par leur adhésion au <strong>Data Privacy Framework</strong>{" "}
            UE–États-Unis lorsqu&apos;elle existe.
          </p>
          <p>Nous ne vendons jamais vos données.</p>
        </LegalSection>

        <LegalSection title="Durée de conservation">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Votre compte et votre suivi</strong> : tant que votre compte existe. Un compte qui n&apos;est plus utilisé depuis 3 ans est supprimé, après un e-mail de prévenance envoyé 30 jours avant.</li>
            <li><strong>À la suppression du compte</strong> : tout est effacé immédiatement (profil, suivi, pesées, mémoire du Guide, messages, photos), sauf les copies de sauvegarde techniques, écrasées sous 30 jours.</li>
            <li><strong>Compteurs d&apos;usage et de tentatives</strong> : quelques heures à deux jours.</li>
            <li><strong>Facturation</strong>, quand elle existera : 10 ans, comme l&apos;exige la loi.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Vos droits">
          <p>Vous avez le droit d&apos;accéder à vos données, de les corriger, de les effacer, d&apos;en recevoir une copie dans un format lisible (portabilité), de vous opposer à un traitement, d&apos;en demander la limitation, et de retirer votre consentement à tout moment.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Corriger :</strong> votre profil et vos réponses se modifient dans l&apos;application.</li>
            <li><strong>Effacer :</strong> Paramètres → Supprimer mon compte, ou ce que retient votre Guide, un souvenir à la fois.</li>
            <li><strong>Obtenir une copie</strong> ou exercer un autre droit : écrivez à <strong>bonjour@vaiiya.fr</strong>, réponse sous un mois.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Cookies et stockage sur votre appareil">
          <p>
            Vaiiya ne dépose <strong>aucun cookie publicitaire et aucun traceur</strong>. La mesure
            d&apos;audience est anonyme et sans cookie, donc aucun bandeau n&apos;est nécessaire.
          </p>
          <p>
            Votre navigateur garde seulement ce qui fait marcher l&apos;application : votre session de
            connexion, vos préférences (thème, sons, lieu d&apos;entraînement), une séance interrompue à
            reprendre, une séance terminée en attente d&apos;envoi, des copies temporaires de votre journée,
            et la liste des comptes déjà connectés sur cet appareil. Tout cela est effacé de l&apos;appareil
            quand vous supprimez votre compte.
          </p>
        </LegalSection>

        <LegalSection title="Sécurité">
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données, notamment :</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>le <strong>chiffrement des données en transit</strong> (HTTPS / TLS) ;</li>
            <li>des règles de sécurité au niveau de la base de données (<strong>Row Level Security</strong> de Supabase) ;</li>
            <li>une authentification sécurisée et un contrôle d&apos;accès aux données.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Réclamation">
          <p>
            Si vous estimez que le traitement de vos données ne respecte pas la réglementation, vous avez
            le droit d&apos;introduire une réclamation auprès de la <strong>CNIL</strong>{" "}(Commission Nationale
            de l&apos;Informatique et des Libertés) :
            {" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: "var(--exp-encre)" }} className="underline">
              cnil.fr
            </a>.
          </p>
        </LegalSection>

        <p className="text-center text-[11px] font-light mt-8" style={{ color: "var(--text-3)" }}>
          Dernière mise à jour : 17 octobre 2026 · Vaiiya
        </p>
      </motion.div>
    </div>
  );
}
