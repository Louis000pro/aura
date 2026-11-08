// @ts-check
/**
 * Prévient Bing (et les autres moteurs du protocole IndexNow) qu'une page de
 * vaiiya.fr est neuve ou a changé.
 *
 * POURQUOI : en novembre 2026, Bing ne connaissait que deux pages de Vaiiya
 * (l'accueil et /premium). Or la recherche de ChatGPT, Copilot, DuckDuckGo et
 * Yahoo s'appuie sur l'index de Bing. Attendre que son robot repasse peut
 * prendre des semaines ; IndexNow le prévient tout de suite. Le même envoi
 * vaut pour Yandex, Seznam, Naver et Yep, qui partagent les URL reçues.
 * Google ne lit pas IndexNow : pour lui, le sitemap et la Search Console.
 *
 * LA CLÉ N'EST PAS UN SECRET. Le protocole demande de la servir publiquement
 * (`public/<clé>.txt`) : c'est elle qui prouve au moteur que l'envoi vient
 * bien du propriétaire du domaine. La changer = renommer le fichier ET
 * modifier la constante ci-dessous, dans le même commit.
 *
 * USAGE (après une mise en ligne, une fois le déploiement « Ready ») :
 *   node scripts/indexnow.mjs                     toutes les URL du sitemap
 *   node scripts/indexnow.mjs /exercices/squat    seulement ces chemins
 *
 * Ne l'envoyer QUE pour des pages neuves ou modifiées : les moteurs demandent
 * de ne pas renvoyer des URL qui n'ont pas changé.
 */

const HOTE = "vaiiya.fr";
const CLE = "a2ff954ac853b0f9db685b1d82985656";
const EMPLACEMENT_CLE = `https://${HOTE}/${CLE}.txt`;

async function urlsDuSitemap() {
  const reponse = await fetch(`https://${HOTE}/sitemap.xml`);
  if (!reponse.ok) throw new Error(`sitemap illisible (${reponse.status})`);
  const xml = await reponse.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const chemins = process.argv.slice(2);
  const urls = chemins.length
    ? chemins.map((c) => (c.startsWith("http") ? c : `https://${HOTE}${c.startsWith("/") ? c : `/${c}`}`))
    : await urlsDuSitemap();

  // La clé doit être en ligne avant l'envoi, sinon le moteur refuse tout.
  const cle = await fetch(EMPLACEMENT_CLE);
  const texte = cle.ok ? (await cle.text()).trim() : "";
  if (texte !== CLE) {
    console.error(`La clé n'est pas servie à ${EMPLACEMENT_CLE} (statut ${cle.status}). Le déploiement est-il en ligne ?`);
    process.exit(1);
  }

  const reponse = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOTE, key: CLE, keyLocation: EMPLACEMENT_CLE, urlList: urls }),
  });

  // 200 : reçu et traité · 202 : reçu, la clé sera vérifiée ensuite.
  // 400 format · 403 clé invalide · 422 URL hors du domaine · 429 trop d'envois.
  console.log(`IndexNow : ${reponse.status} ${reponse.statusText} pour ${urls.length} URL.`);
  if (reponse.status !== 200 && reponse.status !== 202) {
    console.error(await reponse.text());
    process.exit(1);
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
