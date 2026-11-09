/* ════════════════════════════════════════════════════════════════════
   « Vaiiya en huit questions » : les questions de l’accueil.

   Maquette présentée le 2026-11-09, GO de Louis le même jour. Elles disent en
   deux ou trois phrases ce qu’on demande à Google ou à une IA avant d’essayer
   une application de sport, et ce sont elles qu’une IA peut citer à la place
   de /coach-ia ou de /a-propos.

   ⚠️ UN SEUL TEXTE POUR L’ÉCRAN ET POUR LES ROBOTS. La vitrine les affiche
   (`LandingVitrine`, section « Vaiiya en huit questions ») et `app/page.tsx`
   les répète mot pour mot dans les données structurées `FAQPage`. Les deux
   lisent cette fonction : une réponse ne peut pas dire une chose à l’écran et
   une autre à Google.

   ⚠️ CE MODULE IMPORTE LES CATALOGUES (`chiffresPublics`, `parcours`) : il ne
   s’importe JAMAIS depuis un composant client. La coquille serveur de
   l’accueil le lit et passe les textes en props, comme les chiffres.

   ⚠️ LES CHIFFRES SE LISENT DANS LE CODE, AU MOMENT DE LA CONSTRUCTION, comme
   ceux de `/llms.txt`. Aucun nombre écrit à la main.

   ⚠️ RÈGLES DE LOUIS (2026-11-09) :
     · L’accueil ne dit pas qui fait Vaiiya ni leur âge (« deux lycéens ») :
       c’est réservé aux autres pages (/a-propos, le positionnement §9).
     · Une réponse ne promet ni adaptation automatique, ni plan nutrition, ni
       disponibilité dans un store (`docs/positionnement-public-vaiiya.md`).
       La réponse sur le téléchargement change le jour des applications
       natives, avec les badges et le JSON-LD.
   ════════════════════════════════════════════════════════════════════ */

import { CHIFFRES_PUBLICS, PROGRAMMES_PUBLICS, SEANCES_INCLUSES, SEANCES_SANS_MATERIEL } from "./chiffresPublics";
import { PROGRAMMES } from "./parcours";
import { PLANS, VENTE_OUVERTE } from "./plans";

export type QuestionAccueil = { question: string; reponse: string };

const NB = String.fromCharCode(160);

/** Les espaces insécables du français : avant « ? : ; ! » et dans « ». */
function typo(texte: string): string {
  return texte.replace(/ ([?:;!»])/g, `${NB}$1`).replace(/« /g, `«${NB}`);
}

/** Le titre d’un programme par son identifiant : une erreur au build plutôt
 *  qu’un titre vide le jour où un programme est renommé ou retiré. */
function titre(id: string): string {
  const p = PROGRAMMES.find((x) => x.id === id);
  if (!p) throw new Error(`questionsAccueil : le programme « ${id} » n’existe plus`);
  return p.titre;
}

export function questionsAccueil(): QuestionAccueil[] {
  const c = CHIFFRES_PUBLICS;
  const gratuit = PLANS.free.limits;
  const prog = PROGRAMMES_PUBLICS;
  const inclus = PROGRAMMES.find((p) => p.acces === "inclus");
  const offre = VENTE_OUVERTE
    ? "Vaiiya+, l’offre payante, se découvre sur la page Vaiiya+."
    : "Vaiiya+, l’offre payante, n’est pas encore ouverte.";

  const liste: QuestionAccueil[] = [
    {
      question: "Vaiiya, c’est quoi ?",
      reponse: "Vaiiya est une application web française de musculation et de nutrition, avec un coach IA. Tu suis des séances guidées, tu notes tes repas, et ton Guide, Nora ou Sasha, prépare avec toi ta prochaine séance.",
    },
    {
      question: "Est-ce que c’est gratuit ?",
      reponse: `Oui. Le compte est gratuit, sans carte bancaire : ${SEANCES_INCLUSES} des ${c.seances} séances guidées, les ${c.mouvements} mouvements animés, le coach IA (${gratuit.chatPerDay} messages par jour) et ${gratuit.nutritionPerDay} analyses de repas en photo par jour. ${offre}`,
    },
    {
      question: "Faut-il du matériel ou une salle ?",
      reponse: `Non. ${SEANCES_SANS_MATERIEL} séances se font sans matériel, chez toi, et d’autres demandent des haltères ou une salle. Tu dis où tu t’entraînes, et les séances proposées suivent.`,
    },
    {
      question: "Y a-t-il des programmes sur plusieurs semaines ?",
      reponse: `Oui. Vaiiya propose ${prog.nombre} programmes de ${prog.semainesMin} à ${prog.semainesMax} semaines, comme « ${titre("premiere-traction")} » ou « ${titre("cent-pompes")} », sur les jours que tu choisis. Chacun commence par un test et se termine par le même.${inclus ? ` « ${inclus.titre} » est inclus dans le compte gratuit.` : ""}`,
    },
    {
      question: "Que fait le coach IA ?",
      reponse: "Il répond en français et agit dans l’application : il propose une séance, déplace une séance de ta semaine, note un repas ou propose une recette. Rien ne s’enregistre sans ton accord.",
    },
    {
      question: "Comment Vaiiya compte les calories d’un repas ?",
      reponse: "Tu prends ton assiette en photo : Vaiiya reconnaît chaque aliment, estime son poids et additionne les calories et les macros. Tu peux aussi scanner un code-barres ou écrire ce que tu as mangé.",
    },
    {
      question: "Faut-il télécharger une application ?",
      reponse: "Pas besoin. Vaiiya s’ouvre dans ton navigateur, sur téléphone comme sur ordinateur, et s’installe sur ton écran d’accueil en quelques secondes.",
    },
    {
      question: "Vaiiya remplace-t-elle un coach ou un médecin ?",
      reponse: "Non. Vaiiya donne des repères pour t’entraîner et pour manger. Pour une douleur ou une question de santé, parles-en à un professionnel.",
    },
  ];
  return liste.map((q) => ({ question: typo(q.question), reponse: typo(q.reponse) }));
}
