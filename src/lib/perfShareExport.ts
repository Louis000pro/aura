import { motCouverture } from "@/components/profil/CouvertureSeance";

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
  bg: string;                            // URL de la photo du haut (/perf/aura.jpg)
  /** Le mot géant de l'affiche ; sinon déduit du titre (`motCouverture`). */
  mot?: string;
  /** Le progrès du jour, TOUJOURS positif (« +7,5 » · « kg au couché »). */
  gain?: { v: string; l: string } | null;
};

const DEFAULT_BRAND = "✦ VAIIYA";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rend l'affiche sur un canvas 1080×1920 et renvoie le Blob PNG.
 *
 *  Dessin validé par Louis le 2026-10-17 (maquette « L'affiche ») : la
 *  photo NATURELLE en haut, sans voile, puis un panneau sombre où tout
 *  est CENTRÉ, séparé de la photo par un trait violet → rose (jamais de
 *  jaune). Le mot de la séance en géant, trois chiffres, et le progrès du
 *  jour en rose quand il existe. Aucun chiffre négatif n'y arrive : le
 *  gain vient de `gainDuFait`, qui ne rend que des progrès. */
export async function renderPerfCardBlob(data: PerfShareData): Promise<Blob | null> {
  const W = 1080, H = 1920, PHOTO = 914;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string; fontStretch?: string };
  const ls = (v: number) => { try { c.letterSpacing = `${v}px`; } catch { /* noop */ } };
  const large = (on: boolean) => { try { c.fontStretch = on ? "ultra-expanded" : "normal"; } catch { /* noop */ } };
  const famille = (() => {
    try { return getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"; } catch { return "system-ui, sans-serif"; }
  })();

  // 1) Le panneau sombre, puis la photo « cover » sur le haut.
  const fond = ctx.createLinearGradient(0, PHOTO, 0, H);
  fond.addColorStop(0, "#120C22"); fond.addColorStop(1, "#0B0816");
  ctx.fillStyle = "#0B0816"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = fond; ctx.fillRect(0, PHOTO, W, H - PHOTO);
  try {
    const img = await loadImage(data.bg);
    const s = Math.max(W / img.width, PHOTO / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PHOTO); ctx.clip();
    ctx.drawImage(img, (W - dw) / 2, (PHOTO - dh) / 2, dw, dh);
    ctx.restore();
  } catch { /* le panneau sombre suffit */ }

  // 2) Le trait violet → rose.
  const trait = ctx.createLinearGradient(0, 0, W, 0);
  trait.addColorStop(0, "#8B5CF6"); trait.addColorStop(1, "#C13BC1");
  ctx.fillStyle = trait; ctx.fillRect(0, PHOTO, W, 8);

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  const X = W / 2;

  // 3) Catégorie · date.
  ls(0); large(false);
  ctx.fillStyle = "#A79FC0"; ctx.font = `700 32px ${famille}`;
  ctx.fillText([data.category, data.date].filter(Boolean).join(" · "), X, PHOTO + 92);

  // 4) Le mot géant, réglé pour remplir la largeur utile.
  const mot = (data.mot ?? motCouverture(data.category || "Séance")).toUpperCase();
  large(true); ls(-10);
  ctx.font = `900 100px ${famille}`;
  const largeur = ctx.measureText(mot).width || 1;
  const taille = Math.min(280, Math.floor(100 * (W - 140) / largeur));
  ctx.font = `900 ${taille}px ${famille}`;
  ctx.fillStyle = "#F4F1FB";
  ctx.fillText(mot, X, PHOTO + 120 + taille * 0.86);
  large(false); ls(0);

  // 5) Trois chiffres, le progrès en rose quand il existe.
  /* L'ordre de la maquette : minutes, séries, puis exercices ; le
     progrès prend la troisième case quand il existe. */
  const rangDe = (l: string) => (/min|dur/i.test(l) ? 0 : /s[ée]rie/i.test(l) ? 1 : /exerc|mouv/i.test(l) ? 2 : 3);
  const chiffres = [
    { v: data.hero.value, l: data.hero.unit === "min" ? "minutes" : (data.hero.unit ?? "") },
    ...data.subs,
  ].filter((x) => x.v).sort((a, b) => rangDe(a.l) - rangDe(b.l));
  const cases = chiffres.slice(0, data.gain ? 2 : 3).map((x) => ({ ...x, rose: false }));
  if (data.gain) cases.push({ ...data.gain, rose: true });
  const yC = PHOTO + 150 + taille * 0.86 + 150;
  const col = W / Math.max(1, cases.length);
  cases.forEach((cs, i) => {
    const cx = col * i + col / 2;
    if (i > 0) {
      ctx.fillStyle = "rgba(244,241,251,0.14)"; ctx.fillRect(col * i, yC - 96, 2, 150);
    }
    ctx.fillStyle = cs.rose ? "#F0ABFC" : "#F4F1FB";
    ctx.font = `800 86px ${famille}`; ctx.fillText(cs.v, cx, yC);
    ctx.fillStyle = cs.rose ? "#F0ABFC" : "#A79FC0";
    ctx.font = `500 32px ${famille}`; ctx.fillText(cs.l.toLowerCase(), cx, yC + 50);
  });

  // 6) Le pied : le pseudo, puis la marque.
  ctx.fillStyle = "rgba(244,241,251,0.10)"; ctx.fillRect(64, H - 230, W - 128, 2);
  if (data.user) {
    ctx.fillStyle = "#F4F1FB"; ctx.font = `700 36px ${famille}`;
    ctx.fillText(data.user.replace(/^@/, ""), X, H - 158);
  }
  ctx.fillStyle = "#F4F1FB"; ctx.font = `800 36px ${famille}`;
  ctx.fillText("✦ vaiiya", X, H - 96);

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
  return partagerPng(await renderPerfCardBlob(data), filename);
}

/** Partage natif d'un PNG si l'appareil sait, sinon téléchargement. */
export async function partagerPng(blob: Blob | null, filename: string): Promise<"shared" | "downloaded" | "error"> {
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
