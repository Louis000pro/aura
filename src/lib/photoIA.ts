/**
 * photoIA.ts — préparer une photo avant de l'envoyer à un modèle de vision.
 *
 * ⚠️ AVANT CE MODULE, LA PHOTO PARTAIT TELLE QUELLE, et c'était la première
 * cause des mauvaises analyses (2026-09-25) :
 *   - un iPhone produit du HEIC, que le modèle ne sait pas lire : l'analyse
 *     échouait ou répondait au hasard ;
 *   - une photo de 12 Mpx pèse 3 à 6 Mo, soit 4 à 8 Mo en base64 : au-delà
 *     du plafond du serveur (4 Mo) et de la limite de corps de Vercel
 *     (4,5 Mo), la requête était refusée avant même d'arriver au modèle ;
 *   - l'orientation EXIF était ignorée : une photo prise en portrait pouvait
 *     arriver couchée.
 *
 * On décode (orientation comprise), on redimensionne à 1280 px sur le grand
 * côté, et on réencode en JPEG. 1280 px garde largement assez de détail pour
 * reconnaître un aliment et juger une portion ; au-delà, le modèle
 * redimensionne de toute façon de son côté.
 */
import { decoderPhoto } from "./decoderImage";

const COTE_MAX = 1280;
/** Garde de sécurité sous le plafond serveur (4 Mo de base64). */
const POIDS_MAX_BASE64 = 3.5 * 1024 * 1024;

export type PhotoIA = {
  /** JPEG en base64, sans le préfixe `data:`. */
  base64: string;
  mimeType: "image/jpeg";
  /** L'image prête, en data URL, pour l'aperçu à l'écran. */
  apercu: string;
};

export async function preparerPhotoIA(fichier: File, coteMax = COTE_MAX): Promise<PhotoIA> {
  const image = await decoderPhoto(fichier);
  try {
    if (!image.width || !image.height) throw new Error("format_invalide");
    const ratio = Math.min(1, coteMax / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("compression_impossible");
    // Fond blanc : une image transparente (PNG) ne doit pas virer au noir.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Lissage de qualité : réduire une photo 4x sans lui donne du crénelage.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    let apercu = canvas.toDataURL("image/jpeg", 0.86);
    if (apercu.length > POIDS_MAX_BASE64) apercu = canvas.toDataURL("image/jpeg", 0.7);
    return { base64: apercu.slice(apercu.indexOf(",") + 1), mimeType: "image/jpeg", apercu };
  } finally {
    image.fermer();
  }
}
