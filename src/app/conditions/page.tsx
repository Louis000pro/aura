"use client";

/**
 * /conditions — Conditions générales d'utilisation et de vente.
 *
 * Deux raisons d'exister :
 *   1. On vend un abonnement qui se reconduit tout seul. Sans contrat écrit,
 *      accessible avant le paiement, on ne peut rien opposer à un client
 *      mécontent, et l'information précontractuelle est obligatoire.
 *   2. On vend l'IA comme « illimitée ». La clause d'usage raisonnable est ce
 *      qui rend cette promesse tenable sans se ruiner. Elle doit être ÉCRITE
 *      pour être opposable, et elle doit dire les mêmes chiffres que le code.
 *
 * ⚠️ Les quotas affichés sont lus dans `lib/aiQuotas.ts`, la source unique que
 * le serveur applique. Ne jamais réécrire un chiffre en dur ici : le contrat
 * mentirait au premier changement de limite.
 *
 * ⚠️ Ce texte est une base sérieuse, pas un avis juridique. Les crochets
 * [COMME CECI] restent à compléter, et une relecture par un juriste est
 * nécessaire avant d'encaisser de l'argent.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/plans";
import { LIMITES, QUOTAS_PUBLICS } from "@/lib/aiQuotas";

const MAJ = "30 juillet 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-semibold mb-2.5" style={{ color: "var(--text-0)" }}>{title}</h2>
      <div
        className="rounded-3xl px-5 py-5 text-sm font-light leading-relaxed space-y-2.5"
        style={{
          background: "rgba(var(--surface-rgb),0.7)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          color: "var(--text-body)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function ConditionsPage() {
  const premium = PLANS.premium;
  const prix = formatPrice(premium.priceCents);

  return (
    <div className="min-h-screen px-4 md:px-8 pt-8 pb-28 max-w-3xl mx-auto">
      <Link href="/parametres">
        <motion.div
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl cursor-pointer"
          style={{
            background: "rgba(var(--surface-rgb),0.7)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            color: "var(--text-2)",
          }}
        >
          <ArrowLeft size={15} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium">Retour</span>
        </motion.div>
      </Link>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: "var(--text-0)" }}>
          Conditions générales
        </h1>
        <p className="text-sm font-light mt-1.5" style={{ color: "var(--text-3)" }}>
          Utilisation et vente. Dernière mise à jour : {MAJ}.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>

        <Section title="1. Qui nous sommes, et ce que fait Vaiiya">
          <p>
            Vaiiya est une application de sport et de nutrition éditée à titre non professionnel par un
            particulier, joignable à <strong>bonjour@vaiiya.fr</strong>. Les informations relatives à
            l&apos;éditeur figurent dans les <Link href="/mentions-legales" className="underline" style={{ color: "var(--accent)" }}>mentions légales</Link>.
          </p>
          <p>
            <strong>Vaiiya est aujourd&apos;hui entièrement gratuit.</strong> L&apos;abonnement décrit à
            l&apos;article 4 n&apos;est pas encore ouvert : aucun paiement n&apos;est possible, aucun moyen de
            paiement ne vous est demandé, et rien ne vous est facturé. Les articles relatifs à
            l&apos;abonnement ne s&apos;appliqueront qu&apos;à compter de son ouverture, qui sera annoncée dans
            l&apos;application et accompagnée de la publication de l&apos;identité complète du vendeur.
          </p>
          <p>
            Vaiiya propose des séances d&apos;entraînement, un suivi nutritionnel et un assistant conversationnel.
            En créant un compte, vous acceptez les présentes conditions.
          </p>
          <p>
            <strong>Vaiiya n&apos;est pas un service de santé.</strong> Les séances, les estimations
            nutritionnelles et les réponses de l&apos;assistant sont générées automatiquement, à titre
            informatif. Elles ne constituent ni un diagnostic, ni une prescription, ni un avis médical, et
            ne remplacent pas un professionnel de santé. Demandez l&apos;avis d&apos;un médecin avant de
            reprendre le sport, en cas de pathologie, de grossesse, de blessure ou de régime particulier.
            Vous restez seul juge de ce que vous faites de nos suggestions.
          </p>
        </Section>

        <Section title="2. Votre compte">
          <p>
            Le compte est personnel. Vous êtes responsable de vos identifiants et de ce qui se passe depuis
            votre compte. Le partage d&apos;un compte entre plusieurs personnes n&apos;est pas autorisé.
          </p>
          <p>
            Vous devez avoir au moins 15 ans pour créer un compte. En dessous, l&apos;accord d&apos;un
            titulaire de l&apos;autorité parentale est nécessaire.
          </p>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis Paramètres. La suppression est
            définitive et efface vos données, sauf ce que la loi nous oblige à conserver (facturation).
          </p>
        </Section>

        <Section title="3. L'offre gratuite et l'abonnement Premium">
          <p>
            Vaiiya s&apos;utilise gratuitement, avec les limites indiquées à l&apos;article 5.
            L&apos;abonnement <strong>{premium.name}</strong> coûte <strong>{prix} par mois</strong>, toutes
            taxes comprises, et donne accès à l&apos;ensemble des fonctionnalités.
          </p>
          <p>
            L&apos;abonnement commence par un <strong>essai gratuit de {premium.trialDays} jours</strong>.
            Aucun montant n&apos;est prélevé pendant l&apos;essai. À la fin de l&apos;essai, l&apos;abonnement
            se poursuit automatiquement et le premier prélèvement a lieu, sauf si vous avez résilié avant.
          </p>
          <p>
            <strong>L&apos;abonnement se reconduit automatiquement chaque mois</strong> jusqu&apos;à
            résiliation. Chaque échéance est prélevée d&apos;avance, pour le mois à venir.
          </p>
          <p>
            Les paiements sont traités par <strong>Stripe</strong>. Nous ne voyons ni ne conservons jamais
            votre numéro de carte.
          </p>
          <p>
            Nous pouvons faire évoluer le prix. Vous en seriez informé au moins 30 jours avant, et vous
            pourriez résilier avant l&apos;entrée en vigueur du nouveau tarif. Un changement de prix ne
            s&apos;applique jamais rétroactivement à une échéance déjà payée.
          </p>
        </Section>

        <Section title="4. Résiliation et rétractation">
          <p>
            <strong>Vous pouvez résilier à tout moment</strong>, sans motif et sans frais, depuis
            Paramètres → Compte → « Gérer mon abonnement », ou depuis la page Premium. La résiliation
            prend effet à la fin de la période déjà payée : vous gardez l&apos;accès jusque-là, et rien
            n&apos;est prélevé ensuite.
          </p>
          <p>
            <strong>Droit de rétractation.</strong> Vous disposez de 14 jours pour vous rétracter d&apos;un
            achat à distance. L&apos;abonnement donnant accès à un contenu numérique immédiatement, vous
            acceptez, en souscrivant, que l&apos;exécution commence tout de suite et vous renoncez à votre
            droit de rétractation pour la période déjà exécutée. Cela ne vous empêche jamais de résilier
            comme indiqué ci-dessus.
          </p>
          <p>
            Nous pouvons suspendre ou fermer un compte en cas de manquement grave à ces conditions
            (fraude, contournement des limites, atteinte au service ou aux autres utilisateurs). Sauf
            fraude, un abonnement en cours est alors remboursé au prorata de la période non utilisée.
          </p>
        </Section>

        <Section title="5. Usage raisonnable des fonctions d'intelligence artificielle">
          <p>
            Les fonctions d&apos;IA de Vaiiya (assistant, analyse de photo, estimation de repas, génération
            de recettes et de séances, dictée) reposent sur des services payants à l&apos;usage. Nous les
            présentons comme <strong>illimitées</strong> pour les abonnés, et elles le sont pour un usage
            normal : les plafonds ci-dessous sont posés très au-dessus de ce qu&apos;une personne fait
            réellement en une journée. Ils n&apos;existent que pour empêcher un usage automatisé ou
            manifestement disproportionné.
          </p>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-[13px] mt-1">
              <thead>
                <tr style={{ color: "var(--text-3)" }}>
                  <th className="text-left font-semibold py-2">Par jour</th>
                  <th className="text-right font-semibold py-2 px-2">Gratuit</th>
                  <th className="text-right font-semibold py-2">Premium</th>
                </tr>
              </thead>
              <tbody>
                {QUOTAS_PUBLICS.map(({ categorie, nom }) => (
                  <tr key={categorie} style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.1)" }}>
                    <td className="py-2 pr-2">{nom}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{LIMITES[categorie].gratuit}</td>
                    <td className="py-2 text-right tabular-nums font-semibold" style={{ color: "var(--accent)" }}>
                      {LIMITES[categorie].premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="pt-1">
            Les compteurs se remettent à zéro chaque jour à minuit (heure de Paris). Une limite de
            fréquence s&apos;applique également sur de très courtes durées, pour absorber les envois en
            rafale. La taille d&apos;un message, d&apos;une photo ou d&apos;un enregistrement est également
            plafonnée.
          </p>
          <p>
            <strong>Ce qui est interdit :</strong> accéder au service autrement que par l&apos;application
            (script, robot, automatisation), revendre ou redistribuer les réponses de l&apos;IA, partager un
            compte entre plusieurs personnes, ou contourner les limites de quelque manière que ce soit.
          </p>
          <p>
            Si un usage atteint ces plafonds de façon répétée, nous vous contacterons avant toute mesure.
            Nous ne coupons jamais un accès du jour au lendemain sans prévenir, sauf abus automatisé
            manifeste.
          </p>
          <p style={{ color: "var(--text-3)" }} className="text-[13px]">
            Ces valeurs peuvent évoluer si les coûts des services sous-jacents changent. Cette page affiche
            toujours les valeurs réellement appliquées.
          </p>
        </Section>

        <Section title="6. Ce que vous nous confiez">
          <p>
            Vos contenus (photos, messages, mesures, séances) restent les vôtres. Vous nous accordez
            seulement le droit de les traiter pour faire fonctionner le service.
          </p>
          <p>
            Pour répondre, l&apos;assistant et les analyses transmettent le contenu nécessaire à nos
            prestataires d&apos;IA. Le détail des traitements, des destinataires et de vos droits figure
            dans la <Link href="/confidentialite" className="underline" style={{ color: "var(--accent)" }}>politique de confidentialité</Link>.
          </p>
          <p>
            Vous vous engagez à ne pas publier de contenu illégal, haineux, ou portant atteinte aux droits
            d&apos;autrui, y compris dans les conversations.
          </p>
        </Section>

        <Section title="7. Disponibilité, maintenance et évolutions">
          <p>
            Vaiiya est fourni <strong>en l&apos;état</strong> et évolue en permanence. Nous faisons de notre
            mieux pour que tout fonctionne en continu, mais <strong>nous ne garantissons aucune
            disponibilité ininterrompue</strong>, ni pour l&apos;application entière, ni pour une
            fonctionnalité en particulier.
          </p>
          <p>
            <strong>Des interruptions et des maintenances peuvent survenir à tout moment</strong>, de façon
            planifiée ou non, et concerner n&apos;importe quelle partie du service : entraînement, nutrition,
            assistant, notifications, communauté, comptes, paiements. Elles peuvent toucher tous les
            utilisateurs ou seulement certains, <strong>comptes gratuits comme abonnés</strong>, sur tout ou
            partie de la période d&apos;abonnement.
          </p>
          <p>
            Nous pouvons en particulier <strong>suspendre, limiter, corriger, modifier ou retirer une
            fonctionnalité sans préavis</strong> lorsque c&apos;est nécessaire pour : corriger une anomalie,
            protéger vos données ou celles des autres, contenir un abus ou une faille de sécurité, ou parce
            qu&apos;un prestataire dont nous dépendons (hébergement, base de données, paiement, modèles
            d&apos;intelligence artificielle) est indisponible, modifie ses conditions ou cesse son service.
            Quand la situation le permet, nous prévenons dans l&apos;application.
          </p>
          <p>
            Certaines fonctionnalités sont <strong>récentes ou expérimentales</strong> et peuvent comporter
            des anomalies, en particulier celles reposant sur l&apos;intelligence artificielle. Elles peuvent
            être ajustées, remplacées ou retirées.
          </p>
          <p>
            Nous ne sommes pas responsables des indisponibilités qui ne nous sont pas imputables (panne d&apos;un
            prestataire, de votre appareil, de votre connexion, force majeure), ni des conséquences
            indirectes d&apos;une interruption. Notre responsabilité, lorsqu&apos;elle est engagée, est
            limitée aux sommes que vous avez versées au titre de l&apos;abonnement sur les douze derniers
            mois.
          </p>
          <p>
            <strong>Ce que cette clause ne fait pas :</strong> elle n&apos;autorise pas à vous facturer un
            service que vous n&apos;auriez pas. Si une interruption longue nous est imputable, vous obtenez
            sur demande un geste commercial au prorata. Si une fonctionnalité essentielle de
            l&apos;abonnement disparaissait durablement, vous pouvez résilier et être remboursé au prorata.
            Rien ici ne vous prive de vos droits de consommateur.
          </p>
        </Section>

        <Section title="8. Réclamation et litige">
          <p>
            En cas de problème, écrivez-nous d&apos;abord à <strong>bonjour@vaiiya.fr</strong> : c&apos;est
            presque toujours le plus rapide.
          </p>
          <p>
            Le recours gratuit à un médiateur de la consommation est ouvert aux litiges nés d&apos;un
            contrat de vente ou de service conclu avec un professionnel. Le service étant aujourd&apos;hui
            gratuit et sans vente, aucun médiateur n&apos;est désigné à ce jour. Un médiateur sera désigné
            et ses coordonnées publiées ici avant l&apos;ouverture de l&apos;abonnement.
          </p>
          <p>
            Les présentes conditions sont soumises au droit français. Rien dans ce texte ne vous prive des
            droits que la loi vous accorde en tant que consommateur.
          </p>
        </Section>

        <p className="text-xs font-light text-center mt-8" style={{ color: "var(--text-3)" }}>
          En utilisant Vaiiya, vous acceptez ces conditions.<br />
          <Link href="/mentions-legales" className="underline">Mentions légales</Link>
          {" · "}
          <Link href="/confidentialite" className="underline">Confidentialité</Link>
        </p>
      </motion.div>
    </div>
  );
}
