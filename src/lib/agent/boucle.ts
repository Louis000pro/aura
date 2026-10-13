/* ════════════════════════════════════════════════════════════════════
   La boucle d'un agent : regarder, agir, vérifier, recommencer.

   ⚠️ PROTOTYPE DU TEST « AGENT » DU 2026-10-13. Rien dans l'app ne
   l'appelle : seule la route de préversion /api/preuve-agent s'en sert.

   Un agent n'est pas un autre modèle. C'est le même modèle, à qui l'on
   donne des outils et le droit de les appeler plusieurs fois de suite, en
   voyant le résultat de chaque appel avant de choisir le suivant. Toute la
   différence avec l'aiguilleur d'aujourd'hui (un outil, un seul, à
   l'aveugle) tient dans cette boucle.

   Elle ne sait rien du planning ni du fournisseur : les outils et l'appel
   au modèle lui sont donnés. C'est ce qui permet de la vérifier hors ligne
   avec un faux modèle, et de la brancher sur le vrai sans rien recopier.
   ════════════════════════════════════════════════════════════════════ */

/** Un outil : ce que l'agent peut faire, et la seule façon de le faire. */
export type Outil<E> = {
  nom: string;
  description: string;
  /** Schéma JSON des paramètres, tel que le modèle le reçoit. */
  parametres: Record<string, unknown>;
  /** Rend ce que le modèle lira. Une erreur se rend comme une donnée
   *  (`{ erreur }`), jamais comme une exception : l'agent doit pouvoir la
   *  lire et corriger son geste au tour suivant. */
  executer: (args: Record<string, unknown>, etat: E) => unknown;
  /** Vrai pour l'outil qui clôt le travail (présenter l'aperçu). */
  clot?: boolean;
};

export type AppelOutil = { id: string; nom: string; arguments: string };

export type MessageAgent =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** Ce que rend un appel au modèle, quel que soit le fournisseur. */
export type ReponseModele = {
  texte: string | null;
  appels: AppelOutil[];
  jetonsEntree: number;
  jetonsSortie: number;
  finRaison: string | null;
  /** Les en-têtes de limites du fournisseur, pour ne pas épuiser un quota. */
  limites?: Record<string, string>;
};

export type AppelerModele = (messages: MessageAgent[], outils: Outil<unknown>[]) => Promise<ReponseModele>;

export type GesteJoue = { outil: string; arguments: unknown; resultat: unknown; refuse: boolean };

export type EtapeJouee = { numero: number; dureeMs: number; texte: string | null; gestes: GesteJoue[] };

export type CompteRendu = {
  /** Comment ça s'est arrêté. Seul `apercu` veut dire « travail présenté ». */
  fin: "apercu" | "texte" | "etapes_max" | "erreur";
  messageFinal: string | null;
  etapes: EtapeJouee[];
  jetonsEntree: number;
  jetonsSortie: number;
  dureeMs: number;
  erreur?: string;
  limites?: Record<string, string>;
};

const COUPE = 600;

/** Le résultat d'un outil tel qu'on le garde dans le compte rendu : assez
 *  pour comprendre un échec, pas au point de noyer la lecture. */
function resume(v: unknown): unknown {
  const s = JSON.stringify(v);
  return s && s.length > COUPE ? s.slice(0, COUPE) + "…" : v;
}

export async function jouerAgent<E>(entree: {
  consigne: string;
  demande: string;
  outils: Outil<E>[];
  etat: E;
  appeler: AppelerModele;
  etapesMax?: number;
}): Promise<CompteRendu> {
  const { consigne, demande, outils, etat, appeler } = entree;
  const etapesMax = entree.etapesMax ?? 12;
  const messages: MessageAgent[] = [
    { role: "system", content: consigne },
    { role: "user", content: demande },
  ];
  const etapes: EtapeJouee[] = [];
  let jetonsEntree = 0;
  let jetonsSortie = 0;
  let limites: Record<string, string> | undefined;
  const t0 = Date.now();

  const rendu = (fin: CompteRendu["fin"], messageFinal: string | null, erreur?: string): CompteRendu => ({
    fin, messageFinal, etapes, jetonsEntree, jetonsSortie, dureeMs: Date.now() - t0, erreur, limites,
  });

  for (let numero = 1; numero <= etapesMax; numero++) {
    const t = Date.now();
    let r: ReponseModele;
    try {
      r = await appeler(messages, outils as Outil<unknown>[]);
    } catch (e) {
      const statut = (e as { status?: number }).status;
      return rendu("erreur", null, (statut ? statut + " " : "") + (e as Error).message);
    }
    jetonsEntree += r.jetonsEntree;
    jetonsSortie += r.jetonsSortie;
    if (r.limites) limites = r.limites;

    const etape: EtapeJouee = { numero, dureeMs: Date.now() - t, texte: r.texte, gestes: [] };
    etapes.push(etape);

    // Aucun outil appelé : l'agent a fini en parlant, sans présenter d'aperçu.
    if (r.appels.length === 0) {
      if (r.finRaison === "length") return rendu("erreur", r.texte, "réponse coupée (budget de jetons)");
      return rendu("texte", r.texte);
    }

    messages.push({
      role: "assistant",
      content: r.texte,
      tool_calls: r.appels.map((a) => ({ id: a.id, type: "function" as const, function: { name: a.nom, arguments: a.arguments } })),
    });

    let clos: string | null = null;
    for (const appel of r.appels) {
      const outil = outils.find((o) => o.nom === appel.nom);
      let resultat: unknown;
      let args: Record<string, unknown> = {};
      if (!outil) {
        resultat = { erreur: `L'outil « ${appel.nom} » n'existe pas.` };
      } else {
        try {
          args = appel.arguments ? (JSON.parse(appel.arguments) as Record<string, unknown>) : {};
          resultat = outil.executer(args, etat);
        } catch {
          resultat = { erreur: "Arguments illisibles : ils doivent être un objet JSON valide." };
        }
      }
      const refuse = !!resultat && typeof resultat === "object" && "erreur" in (resultat as object);
      etape.gestes.push({ outil: appel.nom, arguments: args, resultat: resume(resultat), refuse });
      messages.push({ role: "tool", tool_call_id: appel.id, content: JSON.stringify(resultat) });
      if (outil?.clot && !refuse) clos = typeof args.message === "string" ? args.message : "";
    }
    if (clos !== null) return rendu("apercu", clos);
  }
  return rendu("etapes_max", null);
}
