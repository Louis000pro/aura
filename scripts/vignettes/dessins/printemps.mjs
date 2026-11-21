// Légumes de fin d’hiver et de printemps, dessinés avec le kit Vaiiya.
import { M, dessiner, ell } from '../kit.mjs';
const I = {};
I.asperge = dessiner('asperge', d => {
  for (const [x,y] of [[8,30],[16,28],[24,31]]) {
    d.vol(`M${x-2} ${y}L${x-2} 10L${x} 3L${x+2} 10L${x+2} ${y}Z`, M.vert);
    d.trait(`M${x-0.5} ${y-2}V12`, '#D8E9A1', .6, .8);
    for (const h of [6,9,12]) d.trait(`M${x-2} ${h+2}L${x} ${h}L${x+2} ${h+2}`, '#426A3C', .65, .8);
  }
});
I.radis = dessiner('radis', d => {
  for (const [x,y] of [[11,19],[23,23]]) {
    d.vol(`M${x} ${y-7}C${x-11} ${y-9} ${x-10} ${y+4} ${x} ${y+7}C${x+10} ${y+4} ${x+10} ${y-9} ${x} ${y-7}Z`, {hi:'#FF91A4',mid:'#E74668',lo:'#B92851'});
    d.vol(`M${x-5} ${y+4}Q${x} ${y+6} ${x+5} ${y+4}L${x} ${y+8}Z`, M.blancFroid);
    d.trait(`M${x} ${y+7}q-1 3 2 3`, '#E9DCC9', .7);
    for (const off of [-3,2]) d.vol(`M${x} ${y-7}Q${x+off-8} ${y-18} ${x+off} ${y-16}Q${x+6} ${y-16} ${x} ${y-7}Z`, M.vert);
  }
});
I.rhubarbe = dessiner('rhubarbe', d => {
  const rouge={hi:'#EF9DAB',mid:'#C94A69',lo:'#8E2D50'};
  for (const [x,y] of [[7,29],[15,31],[24,28]]) {
    d.vol(`M${x-2.5} ${y}L${x-1.5} 5Q${x+1} 3 ${x+3} 5L${x+2.5} ${y}Z`,rouge);
    d.trait(`M${x-.7} ${y-2}L${x+.5} 7`, '#F7B7BC', .7,.85);
    d.vol(ell(x+.7,5,2.4,1.2), {hi:'#E1E7B6',mid:'#AEC079',lo:'#7E9D56'});
  }
});
export default I;
