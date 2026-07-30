/* ════════════════════════════════════════════════════════════════════
   perfShareExport — génère la carte de perf en PNG 1080×1920 (canvas natif)
   pour la partager sur les réseaux (format story). Le fond « aura » est une
   image ; le texte (chiffre géant, marque, stats) est dessiné par-dessus au
   pixel près — donc net et exact, jamais halluciné.

   Le composant PerfShareCard affiche la même compo en DOM (aperçu). Ici on
   REDESSINE la compo sur un canvas pour l'export : la source de vérité de
   l'image finale, c'est cette fonction. Voir [[nutrition-onmangeou-redesign]]
   pour la philosophie « on ne ment pas avec les chiffres ».
   ════════════════════════════════════════════════════════════════════ */

export type PerfShareData = {
  brand?: string;                        // défaut « ✦ VAIIYA »
  date: string;                          // « 10 juil. »
  category: string;                      // « FORCE · HAUT DU CORPS »
  hero: { value: string; unit?: string };// « 45 » + « min »
  subs: { v: string; l: string }[];      // jusqu'à 3 : { v:"293", l:"KCAL" }
  user: string;                          // « @teyroox »
  bg: string;                            // URL de l'image de fond (/perf/aura.jpg)
};

const DEFAULT_BRAND = "✦ VAIIYA";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rend la carte sur un canvas 1080×1920 et renvoie le Blob PNG. */
export async function renderPerfCardBlob(data: PerfShareData): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1) Fond « cover »
  try {
    const img = await loadImage(data.bg);
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } catch {
    ctx.fillStyle = "#050308"; ctx.fillRect(0, 0, W, H);
  }

  // 2) Voile bas (lisibilité)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.38, "rgba(5,3,8,0)");
  g.addColorStop(0.58, "rgba(5,3,8,0.35)");
  g.addColorStop(0.9, "rgba(5,3,8,0.86)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 3) Texte
  const PAD = 64;
  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const ls = (v: number) => { try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${v}px`; } catch { /* noop */ } };
  ctx.textBaseline = "alphabetic";

  // Haut : marque + date
  ctx.fillStyle = "#fff"; ls(8); ctx.textAlign = "left";
  ctx.font = `600 40px ${sans}`; ctx.fillText(data.brand ?? DEFAULT_BRAND, PAD, 118);
  ls(0); ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.textAlign = "right";
  ctx.font = `400 34px ${sans}`; ctx.fillText(data.date, W - PAD, 116); ctx.textAlign = "left";

  // Catégorie
  ls(4); ctx.fillStyle = "#C9B6FF"; ctx.font = `600 34px ${sans}`;
  ctx.fillText(data.category.toUpperCase(), PAD, 1236); ls(0);

  // Héros
  ctx.fillStyle = "#fff"; ctx.font = `600 224px ${sans}`;
  ctx.fillText(data.hero.value, PAD - 6, 1470);
  if (data.hero.unit) {
    const hw = ctx.measureText(data.hero.value).width;
    ctx.fillStyle = "rgba(255,255,255,0.82)"; ctx.font = `400 66px ${sans}`;
    ctx.fillText(data.hero.unit, PAD - 6 + hw + 18, 1470);
  }

  // Séparateur
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, 1548); ctx.lineTo(W - PAD, 1548); ctx.stroke();

  // Sous-stats
  data.subs.slice(0, 3).forEach((sub, i) => {
    const x = PAD + i * 300;
    ctx.fillStyle = "#fff"; ctx.font = `600 62px ${sans}`; ctx.fillText(sub.v, x, 1648);
    ls(2); ctx.fillStyle = "rgba(255,255,255,0.62)"; ctx.font = `400 32px ${sans}`;
    ctx.fillText(sub.l.toUpperCase(), x, 1694); ls(0);
  });

  // Pseudo
  if (data.user) {
    ctx.fillStyle = "rgba(255,255,255,0.82)"; ctx.font = `400 38px ${sans}`;
    ctx.fillText(data.user, PAD, 1800);
  }

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/* ─── Mapper : performance_data (feed/profil) → PerfShareData ───
   La 1re métrique devient le héros, les 3 suivantes les sous-stats. */
export function perfDataToShare(
  pd: { title?: string; date?: string; metrics?: { label: string; value: string; unit?: string }[] },
  opts: { user?: string; bg?: string } = {},
): PerfShareData {
  const metrics = pd.metrics ?? [];
  const hero = metrics[0] ?? { value: "", unit: undefined as string | undefined };
  const u = opts.user?.trim();
  return {
    brand: DEFAULT_BRAND,
    date: pd.date ?? "",
    category: pd.title || "Séance",
    hero: { value: hero.value, unit: hero.unit },
    subs: metrics.slice(1, 4).map((m) => ({ v: m.value, l: m.label })),
    user: u ? (u.startsWith("@") ? u : "@" + u) : "",
    bg: opts.bg ?? "/perf/aura.jpg",
  };
}

/** Partage natif (mobile) si dispo, sinon téléchargement du PNG. */
export async function sharePerfCard(data: PerfShareData, filename = "vaiiya-perf.png"): Promise<"shared" | "downloaded" | "error"> {
  const blob = await renderPerfCardBlob(data);
  if (!blob) return "error";

  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch { /* annulé → on retombe sur le téléchargement */ }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}
