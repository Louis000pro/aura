/**
 * decoderImage.ts — ouvrir une photo du téléphone dans un canvas.
 *
 * Partagé par la messagerie et l'analyse de repas : deux décodeurs finiraient
 * par ne pas traiter pareil l'orientation EXIF ou les formats d'Apple.
 * `createImageBitmap` d'abord (il respecte l'orientation), l'élément image en
 * repli : Safari sait afficher du HEIC que `createImageBitmap` refuse.
 */
export async function decoderPhoto(fichier: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  fermer: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        fermer: () => bitmap.close(),
      };
    } catch {
      // Safari sait parfois afficher un format natif que createImageBitmap
      // refuse : on retente alors via un élément image.
    }
  }

  const url = URL.createObjectURL(fichier);
  const image = document.createElement("img");
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("format_invalide"));
      image.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      fermer: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
