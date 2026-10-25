/* Les emojis Fluent de Microsoft (licence MIT, texte dans fluent/LICENSE) :
   on les lit tels quels, on les recolore, on en retire des morceaux, on les compose. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FLUENT = path.join(path.dirname(fileURLToPath(import.meta.url)), "fluent");

export const lireFluent = (nom) => readFileSync(path.join(FLUENT, `${nom}_color.svg`), "utf8");

/* ── Couleurs ── */
const NOMMEES = { white: "#FFFFFF", black: "#000000" };
export function hexVersHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hslVersHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/* Recolore toutes les couleurs d'un SVG (ou d'une partie : `garde(hex)` dit lesquelles). */
export function recolorer(svg, fn) {
  return svg.replace(/(fill|stop-color|stroke|flood-color)="(#[0-9A-Fa-f]{6}|white|black)"/g, (m, attr, c) => {
    const hex = (NOMMEES[c] || c).toUpperCase();
    const n = fn(hex, hexVersHsl(hex));
    return n ? `${attr}="${n}"` : m;
  });
}

/* ── Éléments de premier niveau (chemins, groupes) ── */
export function elements(svg) {
  const corps = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<defs>[\s\S]*<\/defs>[\s\S]*$/, "");
  const els = [];
  const re = /<(path|g|rect|circle|ellipse)\b[\s\S]*?(?:\/>|<\/\1>)/g;
  let m, prof = 0;
  // Les groupes peuvent s'imbriquer : on découpe à la main au premier niveau.
  let i = 0;
  while (i < corps.length) {
    const debut = corps.indexOf("<", i);
    if (debut < 0) break;
    if (corps.startsWith("<g", debut)) {
      let j = debut, niveau = 0;
      const tag = /<\/?g\b[^>]*>/g;
      tag.lastIndex = debut;
      while ((m = tag.exec(corps))) {
        if (m[0].startsWith("</")) niveau--; else if (!m[0].endsWith("/>")) niveau++;
        if (niveau === 0) { j = tag.lastIndex; break; }
      }
      els.push(corps.slice(debut, j));
      i = j;
    } else {
      re.lastIndex = debut;
      const r = re.exec(corps);
      if (!r || r.index !== debut) { i = debut + 1; continue; }
      els.push(r[0]);
      i = re.lastIndex;
    }
  }
  void prof;
  return els;
}
export function avecElements(svg, garder) {
  const tete = svg.match(/^[\s\S]*?<svg[^>]*>/)[0];
  const defs = (svg.match(/<defs>[\s\S]*<\/defs>/) || [""])[0];
  return `${tete}${garder.join("")}${defs}</svg>`;
}
export function sansIndices(svg, indices) {
  const els = elements(svg);
  return avecElements(svg, els.filter((_, i) => !indices.includes(i)));
}
export function seulementIndices(svg, indices) {
  const els = elements(svg);
  return avecElements(svg, els.filter((_, i) => indices.includes(i)));
}

/* Recolore seulement les éléments choisis (et les dégradés qu'ils utilisent). */
export function recolorerIndices(svg, indices, fn) {
  const els = elements(svg);
  const ids = new Set();
  els.forEach((e, i) => { if (indices.includes(i)) for (const m of e.matchAll(/url\(#([^)]+)\)/g)) ids.add(m[1]); });
  let out = svg;
  // éléments
  els.forEach((e, i) => { if (indices.includes(i)) out = out.replace(e, recolorer(e, fn)); });
  // dégradés
  out = out.replace(/<(linearGradient|radialGradient)\b[^>]*id="([^"]+)"[\s\S]*?<\/\1>/g, (g, _t, id) => (ids.has(id) ? recolorer(g, fn) : g));
  return out;
}

/* Corps et définitions d'un SVG, pour l'insérer dans un dessin. */
export const contenu = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
