import { loadImage, partagerPng } from "@/lib/perfShareExport";
import { frameSrc, pickGenre, resolveGuide } from "@/lib/exerciseGuides";
import { dateCourte, dateRecord, ecartRecord, uniteRecord, valeurRecord, type MesureRecord, type Marche, type Perf } from "@/lib/records";

/* ════════════════════════════════════════════════════════════════════
   L'AFFICHE D'UN RECORD (Louis, 2026-10-22 : « fais aussi l'affiche du
   record à partager »). Un PNG 1080×1920, format story, dessiné au canvas
   comme l'affiche de séance : tout est écrit par le code, donc exact.

   Elle suit la fin de séance claire : le fond de l'aube, les encres
   sombres, le chiffre dans le dégradé violet → rose. Le personnage du
   mouvement en grand, le chiffre géant, ce qu'il y avait avant, et
   l'escalier des dernières marches. Jamais de comparaison avec quelqu'un
   d'autre, jamais de vert, jamais un chiffre négatif.
   ════════════════════════════════════════════════════════════════════ */

export type AfficheRecord = {
  nom: string;
  mesure: MesureRecord;
  meilleur: Marche;
  /** Le record battu, s'il y en avait un : sinon c'est un premier record. */
  avant: Marche | null;
  /** Les marches, dans l'ordre ; la dernière est `meilleur`. */
  marches: Marche[];
  user?: string;
};

const ENCRE = { t1: "#1F1B2E", t2: "#6B6580", t3: "#9A93AE" };

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

export async function renderRecordBlob(d: AfficheRecord): Promise<Blob | null> {
  const W = 1080, H = 1920, X = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const ls = (v: number) => { try { c.letterSpacing = `${v}px`; } catch { /* noop */ } };
  const texte = famille();
  const chiffre = famille("vy-nombre");
  const degrade = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#8B5CF6"); g.addColorStop(1, "#C13BC1");
    return g;
  };

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
  lueur(X, 700, 480, "rgba(139,92,246,0.18)");
  lueur(W * 0.8, 1500, 520, "rgba(193,59,193,0.10)");

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // 2) La marque, puis la pastille.
  ls(0);
  ctx.fillStyle = ENCRE.t1; ctx.font = `800 40px ${texte}`;
  ctx.fillText("✦ vaiiya", X, 150);
  const etiquette = d.avant ? "Nouveau record" : "Mon record";
  ctx.font = `700 38px ${texte}`;
  const lw = ctx.measureText(etiquette).width + 72;
  ctx.fillStyle = degrade(X - lw / 2, X + lw / 2);
  ctx.beginPath(); ctx.roundRect(X - lw / 2, 200, lw, 78, 39); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.fillText(etiquette, X, 252);

  // 3) Le personnage du mouvement, en grand.
  const guide = resolveGuide(d.nom);
  if (guide) {
    try {
      const img = await loadImage(frameSrc(guide, pickGenre(guide), Math.min(1, guide.frames - 1)));
      const T = 600;
      ctx.drawImage(img, X - T / 2, 290, T, T);
    } catch { /* l'affiche tient sans lui */ }
  }

  // 4) Le nom du mouvement.
  ctx.fillStyle = ENCRE.t1; ctx.font = `800 64px ${texte}`;
  ctx.fillText(d.nom, X, 980, W - 140);

  // 5) Le chiffre géant, réglé pour tenir dans la largeur.
  const valeur = valeurRecord(d.mesure, d.meilleur);
  ls(-8);
  ctx.font = `800 100px ${chiffre}`;
  const taille = Math.min(280, Math.floor(100 * (W - 200) / (ctx.measureText(valeur).width || 1)));
  ctx.font = `800 ${taille}px ${chiffre}`;
  const lv = ctx.measureText(valeur).width;
  ctx.fillStyle = degrade(X - lv / 2, X + lv / 2);
  ctx.fillText(valeur, X, 1020 + taille * 0.8);
  ls(0);
  const yUnite = 1020 + taille * 0.8 + 70;
  ctx.fillStyle = ENCRE.t2; ctx.font = `600 44px ${texte}`;
  ctx.fillText(d.mesure === "reps" ? "répétitions d’affilée" : uniteRecord(d.mesure, d.meilleur), X, yUnite);

  // 6) Ce qu'il y avait avant, toujours en positif.
  let y = yUnite + 84;
  if (d.avant) {
    const avant = `Avant : ${valeurRecord(d.mesure, d.avant)}${d.mesure === "charge" && d.avant.reps ? ` × ${d.avant.reps}` : ""}, le ${dateRecord(d.avant.quand)}`;
    const ecart = ecartRecord(d.mesure, d.avant, d.meilleur);
    ctx.font = `600 38px ${texte}`;
    const la = ctx.measureText(avant).width;
    ctx.font = `800 44px ${chiffre}`;
    const le = ctx.measureText(ecart).width;
    const total = la + 28 + le, x0 = X - total / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = ENCRE.t2; ctx.font = `600 38px ${texte}`; ctx.fillText(avant, x0, y);
    ctx.fillStyle = degrade(x0 + la + 28, x0 + total); ctx.font = `800 44px ${chiffre}`; ctx.fillText(ecart, x0 + la + 28, y);
    ctx.textAlign = "center";
    y += 40;
  }

  // 7) L'escalier des dernières marches.
  const marches = d.marches.slice(-5);
  if (marches.length > 1) {
    const base = 1660, haut = Math.min(200, base - y - 110);
    const max = Math.max(...marches.map((m) => m.valeur));
    const min = Math.min(...marches.map((m) => m.valeur));
    const hb = (v: number) => (max === min ? haut : 70 + ((v - min) / (max - min)) * (haut - 70));
    const gap = 22, largeur = Math.min(150, (W - 200 - gap * (marches.length - 1)) / marches.length);
    const x0 = X - (largeur * marches.length + gap * (marches.length - 1)) / 2;
    marches.forEach((m, i) => {
      const derniere = i === marches.length - 1;
      const x = x0 + i * (largeur + gap), h = hb(m.valeur);
      ctx.fillStyle = derniere ? degrade(x, x + largeur) : `rgba(139,92,246,${0.12 + (i / marches.length) * 0.2})`;
      ctx.beginPath(); ctx.roundRect(x, base - h, largeur, h, [16, 16, 6, 6]); ctx.fill();
      ctx.fillStyle = derniere ? "#6D4BD6" : ENCRE.t2;
      ctx.font = `${derniere ? 800 : 700} 36px ${chiffre}`;
      ctx.fillText(valeurRecord(d.mesure, m), x + largeur / 2, base - h - 18);
      ctx.fillStyle = ENCRE.t3; ctx.font = `500 26px ${texte}`;
      ctx.fillText(dateCourte(m.quand), x + largeur / 2, base + 40);
    });
  }

  // 8) Le pied : le pseudo et la date du record.
  ctx.fillStyle = "rgba(31,27,46,0.08)"; ctx.fillRect(64, H - 150, W - 128, 2);
  ctx.fillStyle = ENCRE.t2; ctx.font = `600 34px ${texte}`;
  ctx.fillText([d.user?.replace(/^@/, ""), dateRecord(d.meilleur.quand)].filter(Boolean).join(" · "), X, H - 84);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function partagerAfficheRecord(d: AfficheRecord): Promise<"shared" | "downloaded" | "error"> {
  return partagerPng(await renderRecordBlob(d), "vaiiya-record.png");
}

/** L'affiche d'un record qui vient d'être battu, en fin de séance. */
export function afficheDuRecordBattu(r: { nom: string; mesure: MesureRecord; marches: Marche[] }, avant: Marche, apres: Perf, user?: string): AfficheRecord {
  const meilleur: Marche = { ...apres, quand: new Date().toISOString() };
  return { nom: r.nom, mesure: r.mesure, meilleur, avant, marches: [...r.marches, meilleur], user };
}
