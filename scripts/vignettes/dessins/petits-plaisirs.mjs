// Ingrédients des goûters faciles, dessinés avec le kit Vaiiya.
import { M, dessiner, ell } from '../kit.mjs';
const I = {};
I['mais-popcorn'] = dessiner('maispopcorn', d => {
  d.vol('M3 19H29Q28 29 16 30Q4 29 3 19Z', M.ceramique);
  d.vol(ell(16,19,13,5), M.beige);
  for (const [x,y,a] of [[7,18,0],[12,16,1],[18,17,0],[24,18,1],[10,21,1],[16,21,0],[22,21,1],[16,14,1]]) {
    d.vol(`M${x-2} ${y+1}Q${x-3} ${y-3} ${x} ${y-3}Q${x+3} ${y-2} ${x+2} ${y+1}Q${x} ${y+3} ${x-2} ${y+1}Z`, a ? M.dore : M.ambre);
    d.trait(`M${x} ${y-1}l.2 2`, '#FFEBB3', .5);
  }
});
I['petit-beurre'] = dessiner('petitbeurre', d => {
  for (const [x,y] of [[3,5],[9,12]]) {
    d.vol(`M${x+2} ${y}H${x+17}L${x+19} ${y+2}V${y+13}L${x+17} ${y+15}H${x+2}L${x} ${y+13}V${y+2}Z`, M.beige);
    d.trait(`M${x+3} ${y+3}H${x+16}V${y+12}H${x+3}Z`, '#BA864A', .8);
    for (let a=0;a<4;a++) for(let b=0;b<2;b++) d.vol(ell(x+5+a*3,y+6+b*3,.45,.45), M.bois);
  }
});
export default I;
