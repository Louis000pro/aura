import { createHmac, timingSafeEqual } from "node:crypto";
export const COOKIE_PARRAINAGE = "vaiiya_parrainage";
export const DUREE_PARRAINAGE = 7 * 86400;
const signature = (texte: string) => {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET manquant");
  return createHmac("sha256", process.env.AUTH_SECRET).update("parrainage:" + texte).digest("hex");
};
export function signerInvitation(code: string, arrivee = Date.now()): string {
  const texte = `${code}.${arrivee}`;
  return `${texte}.${signature(texte)}`;
}
export function lireInvitation(valeur: string | undefined): { code: string; arrivee: string } | null {
  if (!valeur || valeur.length > 200) return null;
  try {
    const [code, temps, signe, ...reste] = valeur.split(".");
    if (reste.length || !/^[a-f0-9]{32}$/.test(code) || !/^\d{13}$/.test(temps) || !/^[a-f0-9]{64}$/.test(signe)) return null;
    if (!timingSafeEqual(Buffer.from(signe, "hex"), Buffer.from(signature(`${code}.${temps}`), "hex"))) return null;
    const age = Date.now() - Number(temps);
    return age >= -60_000 && age <= DUREE_PARRAINAGE * 1000 ? { code, arrivee: new Date(Number(temps)).toISOString() } : null;
  } catch { return null; }
}
