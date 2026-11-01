import { loadImage, partagerPng } from "@/lib/perfShareExport";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import {
  bilanDe, dateLongue, ecartProgres, milliers, repsAuTotal, scoreCourt, scoreLong, unite,
  type Classique, type ScoreClassique, type ScoreDate,
} from "@/lib/classiques";

/* ════════════════════════════════════════════════════════════════════
   L'AFFICHE D'UN CLASSIQUE (maquette « Le chrono et le score » : « l'affiche
   à partager », proposée par Louis le 2026-10-31). Un PNG 1080×1920,
   format story, dessiné au canvas comme l'affiche d'un record : tout est
   écrit par le code, donc exact.

   Le nom du classique en géant, le personnage, le score dans le dégradé
   violet → rose, ce qu'il y avait avant (toujours en positif) et
   l'escalier de tes meilleurs. Jamais de comparaison avec quelqu'un
   d'autre, jamais de vert, jamais un recul.
   ════════════════════════════════════════════════════════════════════ */

const ENCRE = { t1: "#1F1B2E", t2: "#6B6580", t3: "#9A93AE" };
const NB = String.fromCharCode(160);

function famille(classe?: string): string {
  try {
    if (!classe) return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const el = document.createElement("span");
    el.className = classe; el.style.position = "absolute"; el.style.visibility = "hidden";
    document.body.appendChild(el);
    const f = getComputedStyle(el).fontFamily;
    el.remove();
    return f || "system-ui, sans-serif";
  } catch { return "system-ui, sans-serif"; }
}

/** La ligne sous le score : ce que le chiffre mesure. */
function mesure(c: Classique): string {
  switch (c.sorte) {
    case "temps": return c.etapes?.[0]?.[0]?.exercice === "Rameur" ? `${milliers(repsAuTotal(c))}${NB}mètres, au chrono` : `${repsAuTotal(c)} répétitions, au chrono`;
    case "tours": return `tours + répétitions en ${c.minutes}${NB}minutes`;
    case "reps": return `${unite(c.mouvement ?? "", 2)} en ${c.minutes}${NB}minutes`;
    case "tenue": return "à la chaise au mur, en une seule fois";
    case "minute": return "la dernière minute finie à temps";
  }
}

export async function renderClassiqueBlob(c: Classique, score: ScoreClassique, historique: ScoreDate[] | null, user?: string): Promise<Blob | null> {
  const W = 1080, H = 1920, X = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const ls = (v: number) => { try { cx.letterSpacing = `${v}px`; } catch { /* noop */ } };
  const texte = famille();
  const chiffre = famille("vy-nombre");
  const degrade = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#8B5CF6"); g.addColorStop(1, "#C13BC1");
    return g;
  };
  const quand = new Date().toISOString();
  const bilanAvant = historique ? bilanDe(historique) : null;
  const avant = bilanAvant?.meilleur ?? null;
  const nouveau = !!avant && (score.sorte === "temps" ? score.valeur < avant.valeur : score.valeur > avant.valeur);
  const premier = !!bilanAvant && bilanAvant.essais.length === 0;

  // 1) Le fond de l'aube, et deux lumières douces.
  const fond = ctx.createLinearGradient(0, 0, W * 0.3, H);
  fond.addColorStop(0, "#FBFAFF"); fond.addColorStop(0.38, "#F6F1FF");
  fond.addColorStop(0.72, "#FFF3F8"); fond.addColorStop(1, "#FFF8EE");
  ctx.fillStyle = fond; ctx.fillRect(0, 0, W, H);
  const lueur = (x: number, y: number, r: number, couleur: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, couleur); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  lueur(W * 0.15, 520, 460, "rgba(139,92,246,0.16)");
  lueur(W * 0.85, 1500, 520, "rgba(193,59,193,0.10)");
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // 2) La marque, puis la pastille.
  ls(0);
  ctx.fillStyle = ENCRE.t1; ctx.font = `800 40px ${texte}`;
  ctx.fillText("✦ vaiiya", X, 130);
  const etiquette = nouveau ? "Nouveau meilleur" : premier ? "Mon premier score" : "Mon classique";
  ctx.font = `700 38px ${texte}`;
  const lw = ctx.measureText(etiquette).width + 72;
  ctx.fillStyle = degrade(X - lw / 2, X + lw / 2);
  ctx.beginPath(); ctx.roundRect(X - lw / 2, 180, lw, 78, 39); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.fillText(etiquette, X, 232);

  // 3) Le nom du classique, en géant, réglé pour tenir dans la largeur.
  const nom = c.titre.toUpperCase();
  ctx.font = `900 100px ${texte}`;
  const tn = Math.min(120, Math.floor(100 * (W - 140) / (ctx.measureText(nom).width || 1)));
  ctx.fillStyle = ENCRE.t1; ctx.font = `900 ${tn}px ${texte}`;
  ctx.fillText(nom, X, 300 + tn * 0.8);

  // 4) Le personnage du premier mouvement.
  const premierMouvement = c.etapes?.[0]?.[0]?.exercice ?? c.tour?.[0]?.exercice ?? c.mouvement ?? "";
  const guide = resolveGuide(premierMouvement);
  if (guide) {
    try {
      const img = await loadImage(frameSrc(guide, pickGenre(guide), Math.min(1, guide.frames - 1)));
      const T = 560;
      ctx.drawImage(img, X - T / 2, 330 + tn * 0.8, T, T);
    } catch { /* l'affiche tient sans lui */ }
  }

  // 5) Le score géant.
  const valeur = c.sorte === "tours" ? scoreCourt(score).split(NB).join(" ") : scoreCourt(score);
  ls(-6);
  ctx.font = `900 100px ${texte}`;
  const ts = Math.min(300, Math.floor(100 * (W - 180) / (ctx.measureText(valeur).width || 1)));
  ctx.font = `900 ${ts}px ${texte}`;
  const lv = ctx.measureText(valeur).width;
  ctx.fillStyle = degrade(X - lv / 2, X + lv / 2);
  const yScore = 1010 + tn * 0.4 + ts * 0.7;
  ctx.fillText(valeur, X, yScore);
  ls(0);
  ctx.fillStyle = ENCRE.t2; ctx.font = `600 44px ${texte}`;
  ctx.fillText(mesure(c), X, yScore + 74, W - 120);

  // 6) Ce qu'il y avait avant, toujours en positif.
  const y = yScore + 150;
  const ecart = avant ? ecartProgres(c, avant, score) : null;
  if (avant && ecart) {
    const debut = `Avant : ${scoreLong(c, avant).split(NB).join(" ")}, le ${dateLongue(avant.quand).split(NB).join(" ")} · `;
    const fin = `${ecart.valeur.split(NB).join(" ")} ${ecart.unite}`;
    ctx.font = `600 38px ${texte}`;
    const ld = ctx.measureText(debut).width;
    ctx.font = `800 38px ${texte}`;
    const lf = ctx.measureText(fin).width;
    const x0 = X - (ld + lf) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = ENCRE.t2; ctx.font = `600 38px ${texte}`; ctx.fillText(debut, x0, y);
    ctx.fillStyle = degrade(x0 + ld, x0 + ld + lf); ctx.font = `800 38px ${texte}`; ctx.fillText(fin, x0 + ld, y);
    ctx.textAlign = "center";
  }

  // 7) L'escalier de tes meilleurs.
  const marches = historique ? bilanDe([...historique, { ...score, quand }]).escalier.slice(-4) : [];
  if (marches.length > 1) {
    const base = H - 230, haut = Math.min(210, base - y - 110);
    const gap = 26, largeur = Math.min(180, (W - 240 - gap * (marches.length - 1)) / marches.length);
    const x0 = X - (largeur * marches.length + gap * (marches.length - 1)) / 2;
    marches.forEach((m, i) => {
      const derniere = i === marches.length - 1;
      const h = 70 + ((i + 1) / marches.length) * (haut - 70);
      const x = x0 + i * (largeur + gap);
      ctx.fillStyle = derniere ? degrade(x, x + largeur) : `rgba(139,92,246,${0.12 + (i / marches.length) * 0.16})`;
      ctx.beginPath(); ctx.roundRect(x, base - h, largeur, h, [18, 18, 8, 8]); ctx.fill();
      ctx.fillStyle = derniere ? "#6D4BD6" : ENCRE.t2;
      ctx.font = `${derniere ? 800 : 700} 38px ${chiffre}`;
      ctx.fillText(scoreCourt(m).split(NB).join(" "), x + largeur / 2, base - h - 20);
    });
  }

  // 8) Le pied : le pseudo et la date.
  ctx.fillStyle = "rgba(31,27,46,0.08)"; ctx.fillRect(64, H - 150, W - 128, 2);
  ctx.fillStyle = ENCRE.t2; ctx.font = `600 34px ${texte}`;
  const jour = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  ctx.fillText([user?.replace(/^@/, ""), jour].filter(Boolean).join(" · "), X, H - 84);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function partagerAfficheClassique(c: Classique, score: ScoreClassique, historique: ScoreDate[] | null, user?: string): Promise<"shared" | "downloaded" | "error"> {
  return partagerPng(await renderClassiqueBlob(c, score, historique, user), `vaiiya-${c.id}.png`);
}
