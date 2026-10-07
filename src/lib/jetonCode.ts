/**
 * Le jeton du code reçu par e-mail à l'inscription. Serveur uniquement.
 *
 * Le navigateur garde ce jeton entre l'envoi du code et sa saisie. Il ne
 * contient JAMAIS le code en clair : seulement une empreinte HMAC du couple
 * (adresse, code), scellée avec AUTH_SECRET. L'ancienne version y mettait le
 * code lui-même, en base64 : n'importe qui le lisait sans ouvrir sa boîte mail.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/serverEnv";

type Contenu = { email: string; empreinte: string; expires: number };

function hmac(texte: string): string {
  return createHmac("sha256", getAuthSecret()).update(texte).digest("hex");
}

function empreinteCode(email: string, code: string): string {
  return hmac(`code:${email.toLowerCase().trim()}:${code.trim()}`);
}

function egaux(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function creerJeton(email: string, code: string, dureeMs: number): string {
  const contenu: Contenu = { email, empreinte: empreinteCode(email, code), expires: Date.now() + dureeMs };
  const data = JSON.stringify(contenu);
  return Buffer.from(data).toString("base64") + "." + hmac(data);
}

export type Verification =
  | { ok: true; email: string; signature: string; expires: number }
  | { ok: false; erreur: string };

export function verifierJeton(jeton: unknown, code: unknown): Verification {
  if (typeof jeton !== "string" || typeof code !== "string") return { ok: false, erreur: "Données manquantes." };
  const point = jeton.lastIndexOf(".");
  if (point === -1) return { ok: false, erreur: "Code invalide. Renvoie un nouveau code." };

  const data = Buffer.from(jeton.slice(0, point), "base64").toString();
  const signature = jeton.slice(point + 1);
  if (!egaux(signature, hmac(data))) return { ok: false, erreur: "Code invalide. Renvoie un nouveau code." };

  let contenu: Contenu;
  try { contenu = JSON.parse(data) as Contenu; } catch { return { ok: false, erreur: "Code invalide." }; }
  if (!contenu.email || !contenu.empreinte) return { ok: false, erreur: "Code invalide. Renvoie un nouveau code." };
  if (Date.now() > contenu.expires) return { ok: false, erreur: "Code expiré. Renvoie un nouveau code." };
  if (!egaux(contenu.empreinte, empreinteCode(contenu.email, code))) return { ok: false, erreur: "Code incorrect." };

  return { ok: true, email: contenu.email, signature, expires: contenu.expires };
}
