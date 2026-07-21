/* ════════════════════════════════════════════════════════════════════
   defiShareExport — la carte de victoire du relais, en PNG 1080×1920.

   Même principe que perfShareExport : l'affiche complète sert de fond,
   tout le texte est dessiné sur le canvas. Rien n'est cuit dans l'image
   source, donc la même affiche peut servir à plusieurs équipes avec
   leurs propres prénoms.

   Ce qu'on met dessus est décidé : les deux prénoms sont le sujet, pas
   la performance. C'est une preuve qu'on l'a fait à deux, pas un score.
   ════════════════════════════════════════════════════════════════════ */

import { imageEtat, NB_ETATS, SERIES } from "@/lib/defi";

export type AfficheShareData = {
  serie: string;
  noms: string[];
  objectif: number;
  fenetre: number;
  date: string;      // « 21 juil. »
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderAfficheBlob(data: AfficheShareData): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1) L'affiche complète, en « cover »
  try {
    const img = await loadImage(imageEtat(data.serie, NB_ETATS));
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } catch {
    ctx.fillStyle = "#050308"; ctx.fillRect(0, 0, W, H);
  }

  // 2) Voile de lecture — dessiné, jamais cuit dans l'image
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.42, "rgba(5,3,8,0)");
  g.addColorStop(0.62, "rgba(5,3,8,0.38)");
  g.addColorStop(0.92, "rgba(5,3,8,0.88)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const PAD = 64;
  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const ls = (v: number) => {
    try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${v}px`; }
    catch { /* Safari ancien : on perd l'interlettrage, pas la carte */ }
  };
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // 3) Bandeau haut : la série, à droite la date
  const serie = SERIES[data.serie as keyof typeof SERIES];
  ls(8); ctx.fillStyle = "#D7A62A"; ctx.font = `700 34px ${sans}`;
  ctx.fillText((serie?.nom ?? data.serie).toUpperCase(), PAD, 118);
  ls(0); ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `400 32px ${sans}`; ctx.fillText(data.date, W - PAD, 116);
  ctx.textAlign = "left";

  // 4) Les prénoms — le sujet de la carte
  ctx.fillStyle = "#fff";
  const noms = data.noms.filter(Boolean);
  if (noms.length <= 2) {
    ctx.font = `600 126px ${sans}`;
    ctx.fillText(noms[0] ?? "", PAD - 4, 1418);
    if (noms[1]) {
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = `300 96px ${sans}`;
      const w = ctx.measureText("& ").width;
      ctx.fillText("&", PAD - 4, 1548);
      ctx.fillStyle = "#fff"; ctx.font = `600 126px ${sans}`;
      ctx.fillText(noms[1], PAD - 4 + w + 26, 1548);
    }
  } else {
    ctx.font = `600 84px ${sans}`;
    ctx.fillText(noms.join(" · "), PAD - 4, 1500);
  }

  // 5) Ce qu'ils ont fait, en une ligne sobre
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, 1622); ctx.lineTo(W - PAD, 1622); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.font = `400 40px ${sans}`;
  ctx.fillText(
    `${data.objectif} jours sur ${data.fenetre}, chacun son tour.`,
    PAD, 1706,
  );

  // 6) Signature ✦ vaiiya
  try {
    const marque = await loadImage("/marque/marque-blanc.png");
    const h = 44, w = (marque.width / marque.height) * h;
    ctx.drawImage(marque, PAD, 1794, w, h);
    ls(12); ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.font = `500 42px ${sans}`;
    ctx.fillText("vaiiya", PAD + w + 20, 1830); ls(0);
  } catch {
    ls(10); ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.font = `600 42px ${sans}`;
    ctx.fillText("✦ vaiiya", PAD, 1830); ls(0);
  }

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Partage natif si dispo (mobile), sinon téléchargement du PNG. */
export async function partagerAffiche(
  data: AfficheShareData,
  filename = "vaiiya-relais.png",
): Promise<"shared" | "downloaded" | "error"> {
  const blob = await renderAfficheBlob(data);
  if (!blob) return "error";

  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch { /* annulé → téléchargement */ }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}
