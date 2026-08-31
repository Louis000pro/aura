import Link from "next/link";
import { PLANS, VENTE_OUVERTE, formatPrice } from "@/lib/plans";

/**
 * Le contenu écrit de /premium.
 *
 * Il existe pour deux lecteurs à la fois, et c'est volontaire :
 *
 * - la personne qui arrive ici veut savoir ce qu'elle a sans payer, ce que
 *   l'abonnement ajoute, et combien ça coûte. Les cartes du haut donnent les
 *   listes ; ce bloc donne les réponses en phrases ;
 * - « prix Vaiiya », « Vaiiya gratuit », « combien coûte Vaiiya » sont des
 *   questions posées aux moteurs de recherche. Avant ce bloc, la page ne
 *   servait aucun texte à un robot : elle était entièrement rendue côté
 *   client. Répondre nous-mêmes vaut mieux que laisser deviner.
 *
 * ⚠️ Les chiffres viennent de `plans.ts`, jamais réécrits à la main. Le prix,
 * les plafonds et l'état de la vente ne peuvent donc pas mentir : le jour où
 * `VENTE_OUVERTE` repasse à vrai, cette page change avec.
 */

const CARTE =
  "rounded-3xl p-5 md:p-7 border";
const CARTE_STYLE: React.CSSProperties = {
  background: "rgba(var(--surface-rgb), 0.55)",
  borderColor: "rgba(139, 92, 246, 0.14)",
};

function limite(n: number, singulier: string, pluriel: string) {
  return n === Infinity ? `${pluriel} sans limite` : `${n} ${n > 1 ? pluriel : singulier}`;
}

export default function InfosPremium() {
  const free = PLANS.free;
  const premium = PLANS.premium;

  return (
    <section className="mt-12 md:mt-16 flex flex-col gap-4 md:gap-5" aria-label="Comprendre l’offre Vaiiya">
      <div className={CARTE} style={CARTE_STYLE}>
        <h2 className="text-xl md:text-2xl font-black mb-3" style={{ color: "var(--text-0)" }}>
          Ce que Vaiiya donne gratuitement
        </h2>
        <p className="text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          Un compte Vaiiya est gratuit et ne demande pas de carte bancaire. Il ouvre le catalogue de
          séances guidées, avec dans chaque collection des séances accessibles sans rien payer, du
          renforcement à la mobilité en passant par le cardio et la récupération. Les 102 mouvements
          de la bibliothèque sont montrés par un personnage animé, avec leur consigne et
          les muscles travaillés : ça ne se paye pas et ça ne se payera pas.
        </p>
        <p className="mt-3 text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          Le planning de la semaine, le suivi du poids et des mesures, les repas notés, le rang qui
          monte à chaque effort et les missions de base sont eux aussi compris. Ce qui est plafonné
          en gratuit, ce sont les usages qui nous coûtent à chaque appel :{" "}
          {limite(free.limits.sessionsMax, "séance à toi gardée", "séances à toi gardées")},{" "}
          {limite(free.limits.chatPerDay, "message", "messages")} par jour avec l&apos;assistant, et{" "}
          {limite(free.limits.nutritionPerDay, "analyse", "analyses")} de repas en photo par jour.
        </p>
      </div>

      <div className={CARTE} style={CARTE_STYLE}>
        <h2 className="text-xl md:text-2xl font-black mb-3" style={{ color: "var(--text-0)" }}>
          Ce que {premium.name} ajoute
        </h2>
        <p className="text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          {premium.name} lève les plafonds plutôt que d&apos;ouvrir une autre application : l&apos;assistant
          répond sans compteur, les analyses de repas ne sont plus comptées, et tes propres séances
          se gardent sans limite de nombre. S&apos;y ajoutent les missions supplémentaires, les
          programmes et entraînements réservés aux abonnés, le détail complet de chaque
          entraînement, et un badge sur ton profil.
        </p>
        <p className="mt-3 text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          Ce qui ne change pas : t&apos;entraîner, créer une séance et t&apos;en servir restent possibles
          dans les deux cas. Vaiiya ne verrouille jamais l&apos;effort lui-même, et il n&apos;y a de
          publicité dans aucune des deux offres.
        </p>
      </div>

      <div className={CARTE} style={CARTE_STYLE}>
        <h2 className="text-xl md:text-2xl font-black mb-3" style={{ color: "var(--text-0)" }}>
          Combien coûte Vaiiya {premium.name} ?
        </h2>
        <p className="text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
          {premium.name} est à <strong style={{ color: "var(--text-0)" }}>{formatPrice(premium.priceCents)} par mois</strong>, sans
          engagement de durée, avec {premium.trialDays} jours d&apos;essai au démarrage. C&apos;est la seule
          offre payante de Vaiiya : il n&apos;y a pas de palier au-dessus, pas de supplément par
          fonctionnalité et pas d&apos;achat à l&apos;intérieur de l&apos;application.
        </p>
        {!VENTE_OUVERTE && (
          <p className="mt-3 text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
            Ce prix est celui qui s&apos;appliquera à l&apos;ouverture. Aujourd&apos;hui, il n&apos;est pas
            possible de souscrire.
          </p>
        )}
      </div>

      {!VENTE_OUVERTE && (
        <div
          className={CARTE}
          style={{ background: "rgba(139, 92, 246, 0.07)", borderColor: "rgba(139, 92, 246, 0.24)" }}
        >
          <h2 className="text-xl md:text-2xl font-black mb-3" style={{ color: "var(--text-0)" }}>
            L&apos;abonnement n&apos;est pas encore ouvert
          </h2>
          <p className="text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
            Nous n&apos;ouvrirons la souscription que lorsque tout le cadre d&apos;une vente au public sera
            en place. En attendant, aucun paiement n&apos;est possible sur Vaiiya, aucun moyen de
            paiement n&apos;est demandé, et personne n&apos;est débité. Le compte gratuit, lui, fonctionne
            entièrement.
          </p>
          <p className="mt-3 text-sm md:text-base font-light leading-relaxed" style={{ color: "var(--text-body)" }}>
            Le détail de ce qui est compris, la durée d&apos;engagement et les conditions de résiliation
            se lisent dans les{" "}
            <Link href="/conditions" className="underline" style={{ color: "var(--accent)" }}>
              conditions générales
            </Link>
            .
          </p>
        </div>
      )}
    </section>
  );
}
