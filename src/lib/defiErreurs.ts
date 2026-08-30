/* ─────────────────────────────────────────────────────────────
   Les refus du relais, traduits une seule fois.

   Le même bloc de `raison === "..." ? "..." :` était recopié dans
   quatre fichiers (la liste des conversations, le fil, les infos,
   la page d'invitation) et avait déjà divergé sur deux cas. Un
   refus qu'on ne sait pas nommer se lit « Impossible pour le
   moment », ce qui n'aide personne.

   Un refus qui NOMME propose aussi une sortie quand il en existe
   une : `ou` porte alors la conversation où le relais bloquant se
   joue, pour que l'écran puisse offrir un bouton plutôt qu'un mur.
   ───────────────────────────────────────────────────────────── */

export type RefusRelais = {
  /** Ce qu'on écrit à l'écran, sans jargon et sans reproche. */
  texte: string;
  /** La conversation à ouvrir, quand le refus a une sortie. */
  ou?: string;
};

type Brut = {
  raison?: string;
  qui?: string;
  conversation_id?: string;
  [k: string]: unknown;
};

export function refusRelais(r: Brut | null | undefined): RefusRelais {
  const raison = r?.raison ?? "";
  const qui = typeof r?.qui === "string" && r.qui ? r.qui : null;
  const ou = typeof r?.conversation_id === "string" ? r.conversation_id : undefined;

  switch (raison) {
    case "pas_un_duo":
      return { texte: "Le relais se joue à deux. Ouvre une discussion avec une seule personne." };

    case "relais_deja_ici":
      return { texte: "Vous avez déjà un relais en cours ici." };

    case "mon_relais_ailleurs":
      return {
        texte: "Tu as déjà un relais en cours ailleurs. Termine-le ou arrête-le d'abord.",
        ou,
      };

    case "son_relais_ailleurs":
      return {
        texte: qui
          ? `${qui} a déjà un relais en cours. Il faudra attendre qu'il se termine.`
          : "L'autre a déjà un relais en cours. Il faudra attendre qu'il se termine.",
      };

    // Renvoyé par `creer_defi_duo` et `rejoindre_defi`, qui ne savent
    // pas dire lequel des deux bloque : la question ne se pose pas,
    // c'est forcément le compte qui appelle.
    case "defi_deja_en_cours":
      return { texte: "Tu as déjà un relais en cours." };

    case "equipe_complete":
      return { texte: "Cette équipe est déjà complète." };

    case "defi_deja_lance":
      return { texte: "Ce relais a déjà démarré sans toi." };

    case "invitation_invalide":
      return { texte: "Cette invitation n'est plus valable." };

    case "relais_en_cours":
      return {
        texte:
          "Ce fil porte un relais à deux. Arrêtez-le d'abord, ou ouvrez un autre groupe.",
      };

    case "pas_membre":
      return { texte: "Tu ne fais pas partie de ce relais." };

    case "non_connecte":
      return { texte: "Reconnecte-toi pour lancer un relais." };

    default:
      return { texte: "Impossible de lancer le relais pour le moment." };
  }
}
