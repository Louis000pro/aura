import { loadImage, partagerPng } from "@/lib/perfShareExport";
import { RANGS, type Rang } from "@/lib/aura";
import { dateLongue, type DonneesCarte } from "@/lib/cartesRang";

/* ════════════════════════════════════════════════════════════════════
   LA STORY D'UNE CARTE DE RANG (Louis, 2026-10-24, maquette « Le passage
   de rang »). Un PNG 1080 × 1920, dessiné au canvas comme l'affiche d'un
   record : tout est écrit par le code, donc exact.

   La nuit de la scène, les rayons du rang, « Nouveau rang », la carte en
   grand, et vaiiya.fr en bas. La carte est la même que dans l'app : ses
   matières, son bord de métal, le pseudo, la date, les séances et les
   jours. Jamais de comparaison, jamais rien sur le corps.
   ════════════════════════════════════════════════════════════════════ */

type Matiere = {
  fond: string[];
  /** Le fond de l'Éternel est une lueur, pas un dégradé droit. */
  lueur?: boolean;
  metal: string[];
  nom: [string, number][];
  encre: string;
  encre2: string;
  reflet: string;
  glow: string;
  holo: number;
};

const M: Record<string, Matiere> = {
  bronze: { fond: ["#5C3418", "#36200E", "#1C0F06"], metal: ["#F7CF98", "#C07A3A", "#6B3A14", "#E9A86A"], nom: [["#FFE4C4", 0], ["#EFAE72", 0.46], ["#A35D26", 0.54], ["#F6C893", 1]], encre: "#FBE8D3", encre2: "rgba(251,232,211,0.7)", reflet: "255,206,150", glow: "232,160,90", holo: 0 },
  argent: { fond: ["#4A525E", "#2A3038", "#14171B"], metal: ["#FFFFFF", "#AEB8C6", "#5F6876", "#E9EEF5"], nom: [["#FFFFFF", 0], ["#E2E8F0", 0.46], ["#8E9AAC", 0.54], ["#F3F6FA", 1]], encre: "#F2F5F9", encre2: "rgba(242,245,249,0.7)", reflet: "235,242,255", glow: "210,222,238", holo: 0 },
  or: { fond: ["#5A3F0A", "#33240A", "#1A1204"], metal: ["#FFF0B8", "#F0B523", "#8A5A06", "#FFE08A"], nom: [["#FFF6CF", 0], ["#FFD34E", 0.46], ["#C98208", 0.54], ["#FFE7A0", 1]], encre: "#FFF3D6", encre2: "rgba(255,243,214,0.7)", reflet: "255,224,150", glow: "255,196,60", holo: 0 },
  platine: { fond: ["#4B4868", "#2C2A45", "#16152A"], metal: ["#FFFFFF", "#D9D2F5", "#7D77A8", "#F4F1FF"], nom: [["#FFFFFF", 0], ["#EEE9FF", 0.46], ["#A69DD8", 0.54], ["#F8F6FF", 1]], encre: "#F5F3FF", encre2: "rgba(245,243,255,0.7)", reflet: "240,235,255", glow: "214,204,255", holo: 0.55 },
  diamant: { fond: ["#1D3D70", "#0F2244", "#060E22"], metal: ["#FFFFFF", "#A8D8FF", "#3A6AA8", "#E6F5FF"], nom: [["#FFFFFF", 0], ["#D6EEFF", 0.44], ["#7FB6F0", 0.54], ["#EAF6FF", 1]], encre: "#EEF7FF", encre2: "rgba(238,247,255,0.72)", reflet: "220,238,255", glow: "150,205,255", holo: 0.85 },
  eternel: { fond: ["#5B2BC4", "#2D1270", "#12062E"], lueur: true, metal: ["#FFE9A8", "#E8A015", "#8B5CF6", "#FFE9A8", "#C9A8FF"], nom: [["#FFF3C6", 0], ["#FFD36B", 0.4], ["#C9A8FF", 0.62], ["#FFF0D2", 1]], encre: "#FFF6E2", encre2: "rgba(255,246,226,0.72)", reflet: "255,230,170", glow: "200,160,255", holo: 0.8 },
};

/** La lumière de la scène autour de la carte, par rang : sa lueur, ses rayons. */
const SCENE: Record<string, { glow: string; ray: string }> = {
  bronze: { glow: "232,160,90", ray: "245,200,138" },
  argent: { glow: "215,225,238", ray: "235,242,250" },
  or: { glow: "255,196,60", ray: "255,214,110" },
  platine: { glow: "214,204,255", ray: "232,226,255" },
  diamant: { glow: "150,205,255", ray: "190,225,255" },
  eternel: { glow: "176,128,255", ray: "255,220,140" },
};

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

type Ctx = CanvasRenderingContext2D;
type Etirement = "normal" | "semi-condensed" | "semi-expanded" | "expanded";

/** Un dégradé linéaire à l'angle CSS (0° = vers le haut, 90° = vers la droite). */
function lineaire(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angle: number, stops: [string, number][]) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const demi = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2, cy = y + h / 2;
  const g = ctx.createLinearGradient(cx - dx * demi, cy - dy * demi, cx + dx * demi, cy + dy * demi);
  for (const [c, o] of stops) g.addColorStop(o, c);
  return g;
}

const reparti = (couleurs: string[]): [string, number][] =>
  couleurs.map((c, i) => [c, couleurs.length > 1 ? i / (couleurs.length - 1) : 0]);

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function etincelle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Le chemin de l'étincelle ✦ (viewBox 24), posé en (x, y), de côté s.
  const k = s / 24;
  ctx.beginPath();
  ctx.moveTo(x + 12 * k, y + 1.5 * k);
  ctx.bezierCurveTo(x + 12.7 * k, y + 8.1 * k, x + 15.4 * k, y + 11.3 * k, x + 22.5 * k, y + 12 * k);
  ctx.bezierCurveTo(x + 15.4 * k, y + 12.7 * k, x + 12.7 * k, y + 15.9 * k, x + 12 * k, y + 22.5 * k);
  ctx.bezierCurveTo(x + 11.3 * k, y + 15.9 * k, x + 8.6 * k, y + 12.7 * k, x + 1.5 * k, y + 12 * k);
  ctx.bezierCurveTo(x + 8.6 * k, y + 11.3 * k, x + 11.3 * k, y + 8.1 * k, x + 12 * k, y + 1.5 * k);
  ctx.closePath();
  ctx.fill();
}

/** La carte, à plat, en (x, y), de largeur w. */
async function dessinerCarte(ctx: Ctx, rang: Rang, d: DonneesCarte, x: number, y: number, w: number, texte: string, chiffre: string) {
  const m = M[rang.id] ?? M.bronze;
  const h = w * 1.4;
  const q = w / 100; // 1 cqw
  const r = 6.5 * q;
  const ls = (v: number) => { try { ctx.letterSpacing = `${v}px`; } catch { /* noop */ } };
  const etire = (v: Etirement) => { try { ctx.fontStretch = v; } catch { /* noop */ } };

  // L'ombre portée, puis la matière.
  ctx.save();
  ctx.shadowColor = "rgba(8,4,20,0.75)";
  ctx.shadowBlur = 12 * q;
  ctx.shadowOffsetY = 6 * q;
  rect(ctx, x, y, w, h, r);
  ctx.fillStyle = m.fond[1];
  ctx.fill();
  ctx.restore();

  ctx.save();
  rect(ctx, x, y, w, h, r);
  ctx.clip();
  if (m.lueur) {
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.26, 0, x + w / 2, y + h * 0.26, h * 0.85);
    g.addColorStop(0, m.fond[0]); g.addColorStop(0.42, m.fond[1]); g.addColorStop(1, m.fond[2]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = lineaire(ctx, x, y, w, h, 160, [[m.fond[0], 0], [m.fond[1], 0.48], [m.fond[2], 1]]);
  }
  ctx.fillRect(x, y, w, h);

  // L'holographique (Platine et plus), au repos.
  if (m.holo > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = m.holo * 0.55;
    ctx.fillStyle = lineaire(ctx, x, y, w, h, 115, [
      ["rgba(255,90,170,0)", 0.18], ["rgba(255,140,200,0.55)", 0.32], ["rgba(255,214,90,0.5)", 0.42],
      ["rgba(90,255,200,0.45)", 0.52], ["rgba(90,180,255,0.5)", 0.62], ["rgba(190,110,255,0.5)", 0.72], ["rgba(190,110,255,0)", 0.86],
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Le reflet, au repos (en haut, au milieu).
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rf = ctx.createRadialGradient(x + w * 0.5, y + h * 0.3, 0, x + w * 0.5, y + h * 0.3, h * 0.42);
  rf.addColorStop(0, `rgba(${m.reflet},0.42)`); rf.addColorStop(0.5, `rgba(${m.reflet},0.1)`); rf.addColorStop(1, `rgba(${m.reflet},0)`);
  ctx.fillStyle = rf;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Le contenu.
  const px = 7.5 * q;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ls(0);

  // En haut : la marque, le numéro.
  const yHaut = y + 6.5 * q + 3.9 * q;
  ctx.fillStyle = m.encre;
  etincelle(ctx, x + px, yHaut - 3.6 * q, 4.4 * q);
  etire("normal");
  ctx.font = `750 ${3.9 * q}px ${texte}`;
  ctx.fillText("Vaiiya", x + px + 5.8 * q, yHaut);
  if (d.numero != null) {
    ctx.textAlign = "right";
    ctx.fillStyle = m.encre2;
    etire("semi-condensed");
    ctx.font = `600 ${3.6 * q}px ${chiffre}`;
    ctx.fillText(`N° ${String(d.numero).padStart(3, "0")}`, x + w - px, yHaut);
    ctx.textAlign = "left";
  }

  // La gemme, sur sa lueur.
  const zone = { cx: x + w / 2, top: y + 6.5 * q + 4.7 * q + 4 * q, h: 50 * q };
  const zc = zone.top + zone.h / 2;
  const gl = ctx.createRadialGradient(zone.cx, zc, 0, zone.cx, zc, 40 * q);
  gl.addColorStop(0, `rgba(${m.glow},0.42)`); gl.addColorStop(0.6, `rgba(${m.glow},0)`);
  ctx.fillStyle = gl;
  ctx.fillRect(zone.cx - 40 * q, zc - 40 * q, 80 * q, 80 * q);
  if (rang.image) {
    try {
      const img = await loadImage(rang.image);
      const gh = zone.h, gw = gh * (img.width / img.height);
      ctx.drawImage(img, zone.cx - gw / 2, zone.top, gw, gh);
    } catch { /* sans image, la lueur reste seule */ }
  }

  // Le nom du rang, dans son métal.
  const tailleNom = Math.min(15, 80 / (rang.nom.length * 0.81)) * q;
  const yNom = zone.top + zone.h + 2.6 * q + tailleNom * 0.78;
  ctx.textAlign = "center";
  etire("expanded");
  ctx.font = `900 ${tailleNom}px ${texte}`;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillText(rang.nom, x + w / 2, yNom + 0.5 * q);
  ctx.restore();
  const gNom = ctx.createLinearGradient(0, yNom - tailleNom * 0.78, 0, yNom + tailleNom * 0.12);
  for (const [c, o] of m.nom) gNom.addColorStop(o, c);
  ctx.fillStyle = gNom;
  ctx.fillText(rang.nom, x + w / 2, yNom);
  ctx.textAlign = "left";

  // Le bas, compté depuis le bord : les chiffres, la date, le pseudo, le trait.
  const bronze = rang.id === "bronze";
  let bas = y + h - 7.5 * q;
  const faits = !bronze && (d.seances != null || d.jours != null);
  if (bronze) {
    etire("normal");
    ctx.fillStyle = m.encre2;
    ctx.font = `700 ${4.4 * q}px ${texte}`;
    ctx.fillText("Le point de départ", x + px, bas - 0.6 * q);
    bas -= 4.4 * q * 1.35 + 3.6 * q;
  } else if (faits) {
    const cols: { v: number; u: string }[] = [];
    if (d.seances != null) cols.push({ v: d.seances, u: d.seances > 1 ? "séances" : "séance" });
    if (d.jours != null) cols.push({ v: d.jours, u: d.jours > 1 ? "jours" : "jour" });
    let cx = x + px;
    for (const c of cols) {
      etire("normal");
      ctx.fillStyle = m.encre2;
      ctx.font = `500 ${3.3 * q}px ${texte}`;
      ctx.fillText(c.u, cx, bas - 0.4 * q);
      const lu = ctx.measureText(c.u).width;
      etire("semi-condensed");
      ctx.fillStyle = m.encre;
      ls(-0.045 * 6.6 * q);
      ctx.font = `700 ${6.6 * q}px ${chiffre}`;
      ctx.fillText(String(c.v), cx, bas - 3.3 * q * 1.3 - 0.4 * q);
      const lv = ctx.measureText(String(c.v)).width;
      ls(0);
      cx += Math.max(lu, lv) + 7 * q;
    }
    bas -= 3.3 * q * 1.3 + 6.6 * q * 1.05 + 1 * q;
    etire("normal");
    ctx.fillStyle = m.encre2;
    ctx.font = `500 ${3.2 * q}px ${texte}`;
    ctx.fillText("Pour y arriver", x + px, bas);
    bas -= 3.2 * q * 1.3 + 3.6 * q;
  }
  const date = dateLongue(bronze ? d.inscritLe : d.atteintLe);
  if (date) {
    etire("normal");
    ctx.fillStyle = m.encre2;
    ctx.font = `500 ${3.7 * q}px ${texte}`;
    ctx.fillText(`${bronze ? "Depuis le" : "Atteint le"} ${date}`, x + px, bas);
    bas -= 3.7 * q * 1.3 + 1.2 * q;
  }
  const pseudo = (d.pseudo.trim() || "toi").toUpperCase();
  etire("semi-expanded");
  ctx.font = `800 ${6.4 * q}px ${texte}`;
  ls(0.06 * 6.4 * q);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillText(pseudo, x + px, bas + 0.4 * q, w - 2 * px);
  ctx.fillStyle = m.encre;
  ctx.fillText(pseudo, x + px, bas, w - 2 * px);
  ls(0);
  bas -= 6.4 * q * 1.1 + 3.6 * q;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = lineaire(ctx, x + px, bas, w - 2 * px, 1, 135, reparti(m.metal));
  ctx.fillRect(x + px, bas, w - 2 * px, Math.max(1, q * 0.2));
  ctx.globalAlpha = 1;
  ctx.restore();

  // Le bord de métal, posé par-dessus.
  ctx.save();
  const e = 1.15 * q;
  rect(ctx, x, y, w, h, r);
  rect(ctx, x + e, y + e, w - 2 * e, h - 2 * e, Math.max(0, r - e));
  ctx.fillStyle = lineaire(ctx, x, y, w, h, 135, reparti(m.metal));
  ctx.fill("evenodd");
  ctx.restore();
}

export async function renderCarteBlob(rangId: string, d: DonneesCarte): Promise<Blob | null> {
  const rang = RANGS.find((r) => r.id === rangId);
  if (!rang) return null;
  const W = 1080, H = 1920, X = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d") as Ctx | null;
  if (!ctx) return null;
  const texte = famille();
  const chiffre = famille("vy-nombre");
  const s = SCENE[rangId] ?? SCENE.bronze;

  // 1) La nuit, et la lumière du rang au milieu.
  const fond = ctx.createLinearGradient(0, 0, 0, H);
  fond.addColorStop(0, "#160B2E"); fond.addColorStop(1, "#05030B");
  ctx.fillStyle = fond; ctx.fillRect(0, 0, W, H);
  const centreY = H * 0.47;
  const lueur = ctx.createRadialGradient(X, H * 0.44, 0, X, H * 0.44, 900);
  lueur.addColorStop(0, `rgba(${s.glow},0.42)`); lueur.addColorStop(1, `rgba(${s.glow},0)`);
  ctx.fillStyle = lueur; ctx.fillRect(0, 0, W, H);

  // 2) Les rayons, qui s'effacent vers les bords.
  const rayons = document.createElement("canvas");
  rayons.width = W; rayons.height = H;
  const rc = rayons.getContext("2d");
  if (rc) {
    rc.fillStyle = `rgba(${s.ray},0.2)`;
    for (let k = 0; k < 20; k++) {
      const a = ((k * 18 + 9) * Math.PI) / 180;
      const l = 1500, demi = (1.6 * Math.PI) / 180;
      rc.beginPath();
      rc.moveTo(X, centreY);
      rc.lineTo(X + Math.sin(a - demi) * l, centreY - Math.cos(a - demi) * l);
      rc.lineTo(X + Math.sin(a + demi) * l, centreY - Math.cos(a + demi) * l);
      rc.closePath();
      rc.fill();
    }
    rc.globalCompositeOperation = "destination-in";
    const masque = rc.createRadialGradient(X, centreY, 0, X, centreY, 920);
    masque.addColorStop(0, "rgba(0,0,0,1)"); masque.addColorStop(1, "rgba(0,0,0,0)");
    rc.fillStyle = masque; rc.fillRect(0, 0, W, H);
    ctx.drawImage(rayons, 0, 0);
  }

  // 3) La marque en haut, « Nouveau rang », la carte, vaiiya.fr en bas.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 50px ${texte}`;
  const larg = ctx.measureText("Vaiiya").width;
  etincelle(ctx, X - (larg + 66) / 2, 76 + 4, 50);
  ctx.textAlign = "left";
  ctx.fillText("Vaiiya", X - (larg + 66) / 2 + 66, 76 + 44);

  const cw = 648, ch = cw * 1.4;
  const yCarte = (H - (ch + 104)) / 2 + 104;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = `700 52px ${texte}`;
  ctx.fillText("Nouveau rang", X, yCarte - 52);

  await dessinerCarte(ctx, rang, d, X - cw / 2, yCarte, cw, texte, chiffre);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = `500 45px ${texte}`;
  ctx.fillText("vaiiya.fr", X, H - 86);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function partagerCarte(rangId: string, d: DonneesCarte): Promise<"shared" | "downloaded" | "error"> {
  return partagerPng(await renderCarteBlob(rangId, d), `vaiiya-carte-${rangId}.png`);
}
