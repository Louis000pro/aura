import { loadImage, partagerPng } from "@/lib/perfShareExport";
import type { CarteDef } from "@/lib/cartes/catalogue";

/* ════════════════════════════════════════════════════════════════════
   LA STORY D'UNE CARTE. Un PNG 1080 × 1920 : la nuit de la scène, les
   rayons de la carte, ce qu'elle est, la carte en grand, vaiiya.fr en bas.

   La carte est dessinée par le MÊME moteur que dans l'app, à l'angle de
   repos : une story ne peut donc pas montrer autre chose que la carte.
   Sans WebGL2, c'est son image cuite. Jamais de comparaison, jamais rien
   sur le corps.
   ════════════════════════════════════════════════════════════════════ */

const W = 1080, H = 1920;
const LARGEUR_CARTE = 648;

function rvb(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
}

function famille(): string {
  try {
    return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  } catch {
    return "system-ui, sans-serif";
  }
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

/** La carte, photographiée par le moteur. Le contexte se rend tout de suite. */
async function imageCarte(carte: CarteDef): Promise<CanvasImageSource | null> {
  try {
    const [{ MoteurCarte }, { fabriquer }] = await Promise.all([import("@/lib/cartes/moteur"), import("@/lib/cartes/faces")]);
    const c = document.createElement("canvas");
    c.width = LARGEUR_CARTE * 2;
    c.height = Math.round(LARGEUR_CARTE * 2 * 1.4);
    const k = new MoteurCarte(c);
    const p = k.preparer(await fabriquer(carte.face));
    k.activer(p);
    k.dessiner(-0.28, -0.2, 3);
    const sortie = document.createElement("canvas");
    sortie.width = c.width;
    sortie.height = c.height;
    sortie.getContext("2d")?.drawImage(c, 0, 0);
    k.detruire();
    return sortie;
  } catch (e) {
    console.warn("[cartes] story sans moteur :", e);
    return carte.vignette ? loadImage(carte.vignette).catch(() => null) : null;
  }
}

export async function renderCarteBlob(carte: CarteDef): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = await imageCarte(carte);
  if (!img) return null;
  const texte = famille();
  const X = W / 2;
  const glow = rvb(carte.lueur);

  // 1) La nuit, et la lumière de la carte au milieu.
  const fond = ctx.createLinearGradient(0, 0, 0, H);
  fond.addColorStop(0, "#160B2E");
  fond.addColorStop(1, "#05030B");
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, W, H);
  const centreY = H * 0.47;
  const lueur = ctx.createRadialGradient(X, H * 0.44, 0, X, H * 0.44, 900);
  lueur.addColorStop(0, `rgba(${glow},0.42)`);
  lueur.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = lueur;
  ctx.fillRect(0, 0, W, H);

  // 2) Les rayons, qui s'effacent vers les bords.
  const rayons = document.createElement("canvas");
  rayons.width = W;
  rayons.height = H;
  const rc = rayons.getContext("2d");
  if (rc) {
    rc.fillStyle = `rgba(${glow},0.2)`;
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
    masque.addColorStop(0, "rgba(0,0,0,1)");
    masque.addColorStop(1, "rgba(0,0,0,0)");
    rc.fillStyle = masque;
    rc.fillRect(0, 0, W, H);
    ctx.drawImage(rayons, 0, 0);
  }

  // 3) La marque en haut, ce qu'est la carte, la carte, vaiiya.fr en bas.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 50px ${texte}`;
  const larg = ctx.measureText("Vaiiya").width;
  etincelle(ctx, X - (larg + 66) / 2, 80, 50);
  ctx.textAlign = "left";
  ctx.fillText("Vaiiya", X - (larg + 66) / 2 + 66, 120);

  const cw = LARGEUR_CARTE, ch = cw * 1.4;
  const yCarte = (H - (ch + 104)) / 2 + 104;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  ctx.font = `700 52px ${texte}`;
  const titre = carte.famille === "rangs" ? `Rang ${carte.place} sur ${carte.surTotal}` : carte.sous;
  ctx.fillText(titre, X, yCarte - 52, W - 120);

  ctx.save();
  ctx.shadowColor = "rgba(8,4,20,0.75)";
  ctx.shadowBlur = 78;
  ctx.shadowOffsetY = 38;
  ctx.drawImage(img, X - cw / 2, yCarte, cw, ch);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = `500 45px ${texte}`;
  ctx.fillText("vaiiya.fr", X, H - 86);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function partagerCarte(carte: CarteDef): Promise<"shared" | "downloaded" | "error"> {
  return partagerPng(await renderCarteBlob(carte), `vaiiya-carte-${carte.id}.png`);
}
