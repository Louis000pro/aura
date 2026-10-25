// Déclinaisons d'emojis Fluent : recolorations, morceaux retirés, compositions.
import { M, Dessin, dessiner, feuille, nervure, ell } from "../kit.mjs";
import { lireFluent, recolorer, recolorerIndices, sansIndices, seulementIndices, hslVersHex as H } from "../fluent.mjs";

const D = {};
const plage = (h, a, b) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

/* Légumes recolorés */
D["cornichon"] = dessiner("cornichon", (d) => {
  const c = recolorer(lireFluent("cucumber"), (hex, [h, s, l]) => (plage(h, 200, 300) ? H(90, 0.3, l * 0.5) : H(82 + (h - 100) * 0.1, Math.min(1, s * 0.75), l * 0.62)));
  d.inclure(c, "translate(-1 9) scale(0.66)");
  d.inclure(c, "translate(12 3) scale(0.66)");
});

D["oignon-rouge"] = recolorer(lireFluent("onion"), (hex, [h, s, l]) => H(318 + (h - 30) * 0.4, Math.min(1, s * 0.82), l * 0.86));

D["echalote"] = dessiner("echalote", (d) => {
  const e = recolorer(lireFluent("onion"), (hex, [h, s, l]) => H(12 + (h - 30) * 0.3, s * 0.62, Math.min(0.97, l * 1.02)));
  d.inclure(e, "translate(-0.4 6.4) scale(0.62 0.8)");
  d.inclure(e, "translate(11.8 4.6) scale(0.66 0.86)");
});

D["poivron-rouge"] = recolorerIndices(lireFluent("bell_pepper"), [...Array(18)].map((_, i) => i + 4), (hex, [h, s, l]) => H(2 + (h - 110) * 0.05, Math.min(1, 0.78 + s * 0.2), 0.36 + l * 0.5));
D["poivron-jaune"] = recolorerIndices(lireFluent("bell_pepper"), [...Array(18)].map((_, i) => i + 4), (hex, [h, s, l]) => H(44 + (h - 110) * 0.05, Math.min(1, 0.85 + s * 0.15), 0.42 + l * 0.48));

D["panais"] = recolorer(lireFluent("carrot"), (hex, [h, s, l]) => (plage(h, 70, 160) ? null : H(40, 0.5, 0.6 + l * 0.32)));

D["potimarron"] = sansIndices(lireFluent("jack-o-lantern"), [7, 8, 9]);

D["olive-noire"] = dessiner("olivenoire", (d) => {
  const o = recolorer(sansIndices(lireFluent("olive"), [4, 5]), (hex, [h, s, l]) => (plage(h, 60, 160) ? H(296, 0.2, 0.06 + l * 0.42) : null));
  d.inclure(o, "translate(1 12) scale(0.56)");
  d.inclure(o, "translate(13.4 13.4) scale(0.56)");
  d.inclure(o, "translate(7.4 3.2) scale(0.56)");
});

D["haricots-blancs"] = recolorer(lireFluent("beans"), (hex, [, s, l]) => H(38, 0.32 + s * 0.1, 0.58 + l * 0.42));
D["haricots-noirs"] = recolorer(lireFluent("beans"), (hex, [, s, l]) => H(285, 0.14, l * 0.45));

D["vin-blanc"] = recolorer(lireFluent("wine_glass"), (hex, [h, s, l]) => (plage(h, 270, 345) ? H(46, 0.88, 0.5 + l * 0.38) : null));

D["eau"] = recolorer(lireFluent("glass_of_milk"), (hex, [h, s, l]) => (s < 0.5 && l > 0.7 ? H(204, 0.88, 0.5 + (l - 0.7) * 1.25) : null));

D["eau-gazeuse"] = dessiner("eaugazeuse", (d) => {
  d.inclure(D["eau"]);
  for (const [x, y, r] of [[13.4, 24, 0.9], [17.6, 21, 0.75], [14.8, 17.6, 0.6], [19.2, 26.2, 1], [12.4, 20.4, 0.55], [18, 14.6, 0.5]]) {
    d.aplat(ell(x, y, r, r), "#FFFFFF", 0.85);
    d.aplat(ell(x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.35), "#FFFFFF", 1);
  }
});

D["poele"] = sansIndices(lireFluent("cooking"), [7, 8, 9, 10, 11, 12, 13]);
D["faitout"] = recolorerIndices(sansIndices(lireFluent("pot_of_food"), [...Array(21)].map((_, i) => i + 7)), [6], (hex, [, , l]) => H(265, 0.12, 0.35 + l * 0.3));
D["assiette"] = seulementIndices(lireFluent("fork_and_knife_with_plate"), [0, 1, 2, 3, 4, 5, 6, 7]);
D["fourchette"] = seulementIndices(lireFluent("fork_and_knife"), [0, 1, 2, 3, 4, 5]);

D["saucisse"] = recolorer(seulementIndices(lireFluent("hot_dog"), [2, 3, 4, 5, 6]), (hex, [, s, l]) => H(13, Math.min(0.72, s * 0.75), l * 0.84));

D["oeufs-chocolat"] = dessiner("oeufschoco", (d) => {
  const oeuf = lireFluent("egg");
  d.inclure(recolorer(oeuf, (hex, [, s, l]) => H(212, 0.62, 0.42 + l * 0.42)), "translate(13.6 9.4) scale(0.6)");
  d.inclure(recolorer(oeuf, (hex, [, s, l]) => H(20, 0.5, l * 0.52)), "translate(1.4 11.2) scale(0.62)");
  d.inclure(recolorer(oeuf, (hex, [, s, l]) => H(332, 0.7, 0.45 + l * 0.38)), "translate(8 13.2) scale(0.6)");
});

/* Compositions */
D["tomates-cerises"] = dessiner("tomcerise", (d) => {
  const t = lireFluent("tomato");
  d.inclure(t, "translate(1 12.4) scale(0.56)");
  d.inclure(t, "translate(13.6 13.2) scale(0.56)");
  d.inclure(t, "translate(7.2 3.6) scale(0.56)");
});

D["thon"] = dessiner("thon", (d) => {
  const boite = recolorerIndices(sansIndices(lireFluent("canned_food"), [7, 8]), [4, 5], (hex, [, s, l]) => H(208, 0.72, 0.3 + l * 0.42));
  d.inclure(boite);
  d.inclure(lireFluent("fish"), "translate(10.4 14.4) scale(0.36)");
});

D["fruits-rouges"] = dessiner("fruitsrouges", (d) => {
  d.inclure(lireFluent("blueberries"), "translate(14.2 13.4) scale(0.56)");
  d.inclure(lireFluent("strawberry"), "translate(0.6 9.6) scale(0.66)");
  d.inclure(lireFluent("cherries"), "translate(12.4 0.4) scale(0.52)");
});

export default D;
