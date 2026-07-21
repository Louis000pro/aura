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

  // 3) La marque en haut, CENTRÉE : le wordmark VAIIYA puis l'étincelle,
  //    à la même hauteur de capitale. Elle est légèrement en retrait —
  //    incrustée dans la photo, pas posée dessus.
  const TAILLE_MOT = 30, HAUTEUR_MARQUE = 22, ECART = 16, Y_MARQUE = 118;
  ls(11); ctx.font = `700 ${TAILLE_MOT}px ${sans}`;
  const largeurMot = ctx.measureText("VAIIYA").width;

  let marque: HTMLImageElement | null = null;
  try { marque = await loadImage("/marque/marque-blanc.png"); } catch { /* le mot suffit */ }
  const largeurMarque = marque ? (marque.width / marque.height) * HAUTEUR_MARQUE : 0;
  const total = largeurMot + (marque ? ECART + largeurMarque : 0);
  const debut = (W - total) / 2;

  // Crème translucide, sans ombre portée : la marque appartient à
  // l'image au lieu d'être une étiquette posée dessus.
  ctx.fillStyle = "rgba(251,244,230,0.58)";
  ctx.fillText("VAIIYA", debut, Y_MARQUE); ls(0);
  if (marque) {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(marque, debut + largeurMot + ECART, Y_MARQUE - HAUTEUR_MARQUE, largeurMarque, HAUTEUR_MARQUE);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `400 32px ${sans}`; ctx.fillText(data.date, W - PAD, 118);
  ctx.textAlign = "left";

  // 4) En bas : le nom du défi, puis ceux qui l'ont gagné.
  const serie = SERIES[data.serie as keyof typeof SERIES];
  ls(8); ctx.fillStyle = "#D7A62A"; ctx.font = `700 34px ${sans}`;
  ctx.fillText((serie?.nom ?? data.serie).toUpperCase(), PAD, 1372); ls(0);

  /* Un pseudo n'est JAMAIS coupé : s'il est trop long pour la largeur
     disponible, c'est la taille qui cède, pas le nom. Un « … » sur le
     prénom de quelqu'un, sur une carte qu'il va montrer, ça ne se fait
     pas. */
  const tailleQuiRentre = (texte: string, base: number, dispo: number) => {
    let taille = base;
    while (taille > 40) {
      ctx.font = `600 ${taille}px ${sans}`;
      if (ctx.measureText(texte).width <= dispo) break;
      taille -= 4;
    }
    return taille;
  };

  ctx.fillStyle = "#fff";
  const noms = data.noms.filter(Boolean);
  const DISPO = W - PAD * 2;

  if (noms.length <= 2) {
    const t1 = tailleQuiRentre(noms[0] ?? "", 122, DISPO);
    ctx.font = `600 ${t1}px ${sans}`;
    ctx.fillText(noms[0] ?? "", PAD - 4, 1502);

    if (noms[1]) {
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `300 92px ${sans}`;
      ctx.fillText("&", PAD - 4, 1626);
      const w = ctx.measureText("&").width;
      const t2 = tailleQuiRentre(noms[1], 122, DISPO - w - 30);
      ctx.fillStyle = "#fff"; ctx.font = `600 ${t2}px ${sans}`;
      ctx.fillText(noms[1], PAD - 4 + w + 30, 1626);
    }
  } else {
    const t = tailleQuiRentre(noms.join(" · "), 82, DISPO);
    ctx.font = `600 ${t}px ${sans}`;
    ctx.fillText(noms.join(" · "), PAD - 4, 1560);
  }

  // 5) Ce qu'ils ont fait, en une ligne sobre
  const yTrait = noms.length <= 2 && noms[1] ? 1698 : 1640;
  ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, yTrait); ctx.lineTo(W - PAD, yTrait); ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.font = `400 40px ${sans}`;
  ctx.fillText(
    `${data.objectif} jours sur ${data.fenetre}, chacun son tour.`,
    PAD, yTrait + 84,
  );

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
