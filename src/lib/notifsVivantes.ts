/* ─────────────────────────────────────────────────────────────
   Les types de notification VIVANTS, et la seule liste qui les
   énumère.

   `like`, `comment` et `repost` sont partis avec leurs routes au
   grand ménage du 2026-08-11. `mention` est parti le 2026-08-30 :
   la contrainte de la base le connaissait, deux écrans savaient
   l'afficher (« t'a mentionné dans un commentaire »), mais aucune
   ligne de code ne l'a jamais écrit, et les commentaires
   n'existent plus.

   ⚠️ D'ANCIENNES LIGNES DE CES QUATRE TYPES VIVENT ENCORE EN BASE.
   On ne les efface pas, on ne les lit plus : la requête filtre sur
   `TYPES_NOTIF_VIVANTS`. C'est ce qui remplace le repli d'avant,
   qui rendait « t'a ajouté à ses amis » pour tout type inconnu,
   c'est-à-dire qu'il racontait n'importe quoi sur une vieille
   notification de like.

   Ajouter un type = 1) l'ajouter ici, 2) l'ajouter à la contrainte
   SQL de `notifications`, 3) lui écrire sa phrase et son icône dans
   les deux écrans. Les trois, ou aucun.
   ───────────────────────────────────────────────────────────── */

export const TYPES_NOTIF_VIVANTS = ["follow", "relais", "message"] as const;

export type NotifType = (typeof TYPES_NOTIF_VIVANTS)[number];
