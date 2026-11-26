import { M, dessiner, ell } from '../kit.mjs';
const U = {};
U.couvercle = dessiner('couvercle', d => {
  d.vol(ell(16,23,14,5), M.acierSombre);
  d.vol('M3 22Q4 11 16 10Q28 11 29 22Q16 29 3 22Z', M.acier);
  d.trait('M6 20Q8 14 13 13', '#FFFFFF', 1.2);
  d.vol(ell(16,10,4,2), M.acierSombre);
  d.vol('M13 10V7Q16 4 19 7V10Z', M.fonte);
});
export default U;
