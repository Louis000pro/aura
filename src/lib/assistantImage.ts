/* ════════════════════════════════════════════════════════════════════
   assistantImage — prépare une image à envoyer à l'✦ (vision).

   Le chat parle à un modèle multimodal : on peut lui montrer une photo
   (un plat, une machine, une posture…). On compresse côté navigateur en
   data URL JPEG, cap à 1024 px de grand axe : la reconnaissance n'a pas
   besoin de plus, et ça garde le payload (base64) raisonnable pour le LLM.

   Client uniquement (canvas/DOM). Fallback Safari via <img> si
   createImageBitmap échoue sur certains formats.
   ════════════════════════════════════════════════════════════════════ */

const MAX_SIDE = 1024;
const QUALITE = 0.72;

async function decoder(fichier: File): Promise<{ source: CanvasImageSource; w: number; h: number; done: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(fichier);
      return { source: bmp, w: bmp.width, h: bmp.height, done: () => bmp.close() };
    } catch { /* fallback <img> */ }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("format_invalide"));
      i.src = url;
    });
    return { source: img, w: img.naturalWidth, h: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Compresse un fichier image en data URL JPEG (prête pour image_url). */
export async function fichierEnDataUrl(fichier: File): Promise<string> {
  if (!fichier.type.startsWith("image/")) throw new Error("format_invalide");
  if (fichier.size > 20 * 1024 * 1024) throw new Error("trop_lourde");

  const { source, w, h, done } = await decoder(fichier);
  if (!w || !h) { done(); throw new Error("format_invalide"); }

  const ratio = Math.min(1, MAX_SIDE / Math.max(w, h));
  const width = Math.max(1, Math.round(w * ratio));
  const height = Math.max(1, Math.round(h * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) { done(); throw new Error("compression_impossible"); }
  try {
    ctx.drawImage(source, 0, 0, width, height);
  } finally {
    done();
  }
  return canvas.toDataURL("image/jpeg", QUALITE);
}
