/* Prompt système de l'extracteur de MÉMOIRE (/api/assistant/analyze).

   ⚠️ Ce prompt ne décide PLUS d'actions. Les actions (créer une séance,
   modifier le planning, noter un repas…) sont devenues des OUTILS appelés
   par le coach lui-même dans /api/chat, cf. `lib/assistantTools.ts`.

   Pourquoi : ce fichier tournait dans un second appel, en parallèle du chat,
   avec moins de contexte (4 messages tronqués, ni profil ni stats) et 1,2 s
   de retard. Les deux modèles ne se voyaient pas, d'où les désynchronisations
   (« je te prépare ça 👇 » sans carte, ou une carte sans phrase). Le texte et
   l'action sortent maintenant du même tour.

   La mémoire, elle, reste ici : elle est silencieuse, personne ne la voit
   arriver, et rien à l'écran n'en dépend. Aucune désynchronisation possible.

   Sorti dans un module lib pour être réutilisable (endpoint de diagnostic)
   sans exporter de constante depuis un fichier de route Next.js. */

export const ANALYZE_SYSTEM = `Tu analyses le DERNIER message d’un utilisateur à son coach de fitness. Tu cherches UNIQUEMENT s’il révèle un fait DURABLE à retenir sur lui.

Réponds UNIQUEMENT par cet objet JSON (rien autour) :
{
  "memory": null | {"type":"save","category":"sante|nutrition|planning|objectif|preference","fact":"<fait court, 3e personne>"} | {"type":"forget","keywords":"<mots-clés>"}
}

QUAND remplir "memory" :
- "save" si l’utilisateur révèle un fait DURABLE et important : blessure / douleur / gêne physique (TOUJOURS category "sante", même dit en passant), régime / allergie / restriction alimentaire (nutrition), planning d’entraînement habituel (planning), objectif de fond (objectif), forte préférence (preference).
- "forget" si l’utilisateur demande explicitement d’oublier quelque chose.
- null pour le temporaire, le banal, une simple question, ou une demande d’action (créer une séance, déplacer un jour, noter un repas : ça ne se retient pas, c’est fait ailleurs).

EXEMPLES :
- "j’ai mal au genou depuis 2 semaines" → save, sante, "A mal au genou depuis deux semaines"
- "je suis végétarien" → save, nutrition, "Est végétarien"
- "je m’entraîne toujours le matin avant le travail" → save, planning, "S’entraîne le matin avant le travail"
- "crée-moi une séance pecs" → null
- "j’ai mangé une pizza ce midi" → null
- "oublie que je suis végétarien" → forget, "végétarien"

RÈGLE : n’invente jamais. Si rien : {"memory":null}.`;
