/* ════════════════════════════════════════════════════════════════════
   check:ia — le banc d'essai du fournisseur d'IA.

     npm run check:ia                    (le fournisseur par défaut)
     AI_PROVIDER=mistral npm run check:ia   (le retour en arrière)

   ⚠️ Il APPELLE le vrai fournisseur, donc il lui faut la clé correspondante
   dans `.env.local` (GROQ_API_KEY ou MISTRAL_API_KEY). Sans clé il s'arrête
   au lieu de faire semblant.

   Ce qu'il vérifie, et pourquoi ces cas-là : le routage vers une action
   (c'est ce qui casse EN SILENCE si le budget de tokens est trop court chez
   un modèle qui raisonne), le streaming du coach, l'absence de fuite de
   raisonnement dans le texte visible, et l'extraction de mémoire en JSON.

   Banc d'essai fournisseur IA. Exerce le VRAI code de l'app : `optionsIA`,
   `deciderAction` (aiguilleur + outils réels) et le même appel de chat que
   /api/chat. Rien n'est recopié, donc ce qui passe ici est ce qui tournera.
   ════════════════════════════════════════════════════════════════════ */
import { llm, optionsIA, FOURNISSEUR, NOM_FOURNISSEUR, hasLLMKey } from "@/lib/llm";
import { deciderAction } from "@/lib/assistantRouter";

let echecs = 0;
function verdict(nom: string, bon: boolean, detail: string) {
  if (!bon) echecs++;
  console.log("[" + (bon ? "OK   " : "ECHEC") + "] " + nom + " — " + detail);
}

async function main() {
  console.log("\n=== Fournisseur : " + NOM_FOURNISSEUR + " (" + FOURNISSEUR + ") · clé " + (hasLLMKey() ? "présente" : "ABSENTE") + " ===");
  console.log("coach : " + JSON.stringify(optionsIA("coach", 600)));
  console.log("outil : " + JSON.stringify(optionsIA("outil", 200)) + "\n");
  if (!hasLLMKey()) { console.log("Pas de clé, on s'arrête."); process.exit(1); }

  // ── 1. Aiguilleur : appel d'outil structuré ──────────────────────────────
  // ⚠️ deciderAction AVALE ses erreurs et rend null. Sans ce capteur, un cas
  // « aucune action » passerait alors que l'appel a échoué.
  let plainte = "";
  const errOrig = console.error;
  console.error = (...a: unknown[]) => { plainte = a.map(String).join(" "); };

  const casRoutage: [string, string | null][] = [
    ["ouvre mes repas", "open_page"],
    ["ouvre mes séances", "open_page"],
    ["fais-moi une séance pecs", "create_seance"],
    ["passe en mode sombre", "set_theme"],
    ["j'ai mangé un burger ce midi", "log_meal"],
    ["salut ça va ?", null],
    ["merci beaucoup", null],
    ["c'est quoi une série dégressive ?", null],
  ];
  const t0 = Date.now();
  for (const [msg, attendu] of casRoutage) {
    const t = Date.now();
    plainte = "";
    let a: Awaited<ReturnType<typeof deciderAction>> = null;
    let err = "";
    try { a = await deciderAction([{ role: "user", content: msg }]); }
    catch (e) { err = String((e as { status?: number }).status) + " " + (e as Error).message; }
    if (plainte) err = plainte;
    const intent = a?.intent ?? null;
    const cible = a && "target" in a ? " → " + String((a as { target?: unknown }).target) : "";
    verdict("routage « " + msg + " »", !err && intent === attendu,
      "attendu " + (attendu ?? "aucune action") + " · reçu " + (intent ?? "aucune action") + cible +
      " · " + (Date.now() - t) + " ms" + (err ? " · " + err : ""));
  }
  console.error = errOrig;
  console.log("   (aiguilleur : " + casRoutage.length + " appels en " + (Date.now() - t0) + " ms)\n");

  // ── 2. Conversation en streaming, exactement comme /api/chat ─────────────
  const t1 = Date.now();
  let premier = 0, texte = "", finish: string | null = null, morceaux = 0;
  try {
    const stream = await llm.chat.completions.create({
      ...optionsIA("coach", 600),
      messages: [
        { role: "system", content: "Tu es le coach sportif de Vaiiya. Tu réponds en français, en tutoyant, en deux phrases maximum, sans markdown." },
        { role: "user", content: "J'ai 30 minutes ce soir, je fais quoi ?" },
      ],
      stream: true,
      temperature: 0.4,
    });
    for await (const chunk of stream) {
      const c = chunk.choices?.[0] as { delta?: { content?: string | null }; finish_reason?: string | null } | undefined;
      if (c?.finish_reason) finish = c.finish_reason;
      const bout = c?.delta?.content ?? "";
      if (bout) { morceaux++; if (!premier) premier = Date.now() - t1; texte += bout; }
    }
  } catch (e) { finish = "erreur: " + (e as Error).message; }
  verdict("conversation en streaming", texte.trim().length > 0 && morceaux > 1,
    texte.length + " caractères en " + morceaux + " morceaux · 1er token à " + premier + " ms · fin « " + finish + " »");
  console.log("   → " + texte.trim().slice(0, 240) + "\n");
  verdict("aucune fuite de raisonnement", !/<think|analysisWe|assistantfinal|<\|channel\|>/i.test(texte),
    "pas de balise de raisonnement dans le texte visible");

  // ── 3. Extraction mémoire : JSON strict, même forme que /api/assistant/analyze
  const t2 = Date.now();
  let brut = "";
  try {
    const c = await llm.chat.completions.create({
      ...optionsIA("outil", 280),
      messages: [
        { role: "system", content: "Tu extrais un fait durable à retenir sur l'utilisateur. Réponds UNIQUEMENT en JSON : {\"memory\": {\"categorie\": \"...\", \"fait\": \"...\"}} ou {\"memory\": null}." },
        { role: "user", content: "Message de l’utilisateur : je suis végétarien depuis 3 ans" },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });
    brut = c.choices[0]?.message?.content ?? "";
  } catch (e) { brut = "ERREUR " + (e as Error).message; }
  let memoire: unknown;
  let parse = false;
  try { memoire = (JSON.parse(brut) as { memory?: unknown }).memory; parse = true; } catch { /* pas du JSON */ }
  verdict("extraction mémoire (JSON)", parse && memoire != null,
    (Date.now() - t2) + " ms · " + brut.replace(/\s+/g, " ").slice(0, 170));

  console.log("\n=== " + (echecs === 0 ? "TOUT PASSE" : echecs + " ECHEC(S)") + " ===\n");
  process.exit(echecs === 0 ? 0 : 1);
}
main();
