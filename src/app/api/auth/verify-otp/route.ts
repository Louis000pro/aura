import { NextRequest } from "next/server";
import { codeValide, ouvrirJeton, signatureDe } from "@/lib/otp";

/* ─── Anti-replay : signatures consommées (en mémoire) ─────────────────
   Une signature ne peut être utilisée qu'une seule fois.
   Auto-nettoyage des entrées expirées toutes les 60 s pour éviter la fuite. */
const usedSignatures = new Map<string, number>(); // sig → expires

/* ─── Borne d'essais, et elle manquait ────────────────────────────────
   ⚠️ UN CODE À SIX CHIFFRES VIT DIX MINUTES, ET RIEN NE COMPTAIT LES ESSAIS.
   Un million de possibilités paraît beaucoup, mais rien n'empêchait d'en
   tenter des dizaines de milliers dans la fenêtre : à quelques dizaines de
   requêtes par seconde, la probabilité de tomber juste cesse d'être
   négligeable. Le compteur est indexé sur la SIGNATURE du jeton, donc sur une
   demande précise : cinq essais, ce qui est large pour quelqu'un qui recopie
   un code depuis sa boîte mail, et sans rapport avec un balayage.
   Comme le reste de ce fichier, il vit en mémoire du processus : ce n'est pas
   une frontière de sécurité distribuée, c'est le garde-fou qui transforme un
   balayage réalisable en balayage qui ne l'est plus par ce chemin. */
const essais = new Map<string, number>(); // sig → nombre d'essais ratés
const MAX_ESSAIS = 5;

let lastCleanup = 0;
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [sig, exp] of usedSignatures) {
    if (exp < now) {
      usedSignatures.delete(sig);
      essais.delete(sig);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, otp } = await req.json();
    if (!token || !otp) return Response.json({ error: "Donnees manquantes" }, { status: 400 });

    /* Le scellé, la forme et les champs obligatoires sont vérifiés là-bas, en
       temps constant. `null` couvre les trois cas d'un seul message : on ne
       dit pas à un fabricant de jetons lequel de ses essais était le moins
       mauvais. */
    const charge = ouvrirJeton(token);
    const sig = signatureDe(String(token));
    if (!charge || !sig) return Response.json({ error: "Token invalide" }, { status: 400 });

    if (Date.now() > charge.expires) {
      return Response.json({ error: "Code expiré. Renvoie un nouveau code." }, { status: 400 });
    }

    cleanup();

    // Déjà consommée ? On refuse avant même de regarder le code.
    if (usedSignatures.has(sig)) {
      return Response.json({ error: "Ce code a déjà été utilisé. Renvoie un nouveau code." }, { status: 400 });
    }

    if ((essais.get(sig) ?? 0) >= MAX_ESSAIS) {
      return Response.json(
        { error: "Trop d’essais. Renvoie un nouveau code." },
        { status: 429 },
      );
    }

    if (!codeValide(charge, otp)) {
      essais.set(sig, (essais.get(sig) ?? 0) + 1);
      return Response.json({ error: "Code incorrect." }, { status: 400 });
    }

    // Marquer la signature comme consommée jusqu'à son expiration
    usedSignatures.set(sig, charge.expires);
    essais.delete(sig);

    return Response.json({ success: true, email: charge.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("verify-otp error:", msg);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
