import { M, dessiner, ell } from "../kit.mjs";

const dessins = {};

dessins.baguette = dessiner("baguette", (d) => {
  d.vol("M3 26Q1 23 5 20L22 5Q26 2 29 5Q32 8 28 12L10 28Q5 31 3 26Z", M.brun);
  d.vol("M4 24Q4 21 8 19L23 6Q27 3 29 7Q29 10 26 12L9 27Q6 29 4 24Z", M.ambre);
  for (const [x,y] of [[9,21],[14,17],[19,13],[24,9]]) {
    d.trait(`M${x-3} ${y-1}q3 -2 6 1`, "#FBD393", 1.25);
  }
});

dessins.sumac = dessiner("sumac", (d) => {
  d.vol("M3 18H29Q27 29 16 29Q5 29 3 18Z", M.ceramique);
  d.vol(ell(16,18,13,5), M.creme);
  d.vol("M5 18Q9 13 16 12Q24 12 27 18Q23 21 16 22Q9 21 5 18Z", { hi: "#C57577", mid: "#A84457", lo: "#6D233A", rim: "#5C2437" });
  for (const [x,y] of [[9,17],[12,16],[15,15],[18,16],[22,17],[12,19],[17,19],[21,19]]) {
    d.vol(ell(x,y,.56,.38), M.rose);
  }
});

dessins["pate-filo"] = dessiner("pate-filo", (d) => {
  for (const y of [20,17,14]) {
    d.vol(`M3 ${y}L18 ${y-7}L29 ${y-2}L13 ${y+5}Z`, M.beige);
    d.trait(`M3 ${y}L13 ${y+5}L29 ${y-2}`, "#BA946A", .6);
  }
  d.vol("M3 14L18 7Q21 9 29 12L13 19Q11 16 3 14Z", M.creme);
});

dessins["feuille-riz"] = dessiner("feuille-riz", (d) => {
  d.vol(ell(16,20,13,7), M.beige);
  d.vol(ell(16,16,13,7), M.creme);
  for (const y of [13,15,17,19]) d.trait(`M8 ${y}Q16 ${y-2} 24 ${y}`, "#D3C5AA", .45);
  for (const x of [11,14,17,20]) d.trait(`M${x} 12l3 7`, "#D3C5AA", .4);
});

dessins.plantain = dessiner("plantain", (d) => {
  d.vol("M4 19Q16 25 24 9L27 5L30 6Q28 24 16 28Q6 30 3 23Z", M.dore);
  d.trait("M5 22Q17 28 27 10", "#B87A2E", .85);
  d.trait("M27 6l2 -1M4 21l-1 2M17 24l2 -1M23 17l1 -1", "#735037", 1.15);
  d.vol(ell(24,24,4.5,3.1), M.ambre);
  d.vol(ell(25,23,3.7,2.4), M.beige);
});

dessins["lait-concentre"] = dessiner("lait-concentre", (d) => {
  d.vol("M7 8H25V25Q25 29 16 29Q7 29 7 25Z", M.kraft);
  d.vol("M7 14Q16 17 25 14V23Q16 26 7 23Z", M.creme);
  d.vol(ell(16,8,9,3.7), M.acier);
  d.vol(ell(16,8,7.3,2.5), M.beige);
  d.vol("M16 16Q19 20 19 21Q19 23 16 23Q13 23 13 21Q13 20 16 16Z", M.creme);
});

export default dessins;
