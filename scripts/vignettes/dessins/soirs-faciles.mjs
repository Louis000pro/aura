import {M,dessiner,ell} from '../kit.mjs';
export default {'sardines': dessiner('sardines',d=>{
 d.vol('M4 8Q2 8 2 11V24Q2 27 5 27H27Q30 27 30 24V11Q30 8 27 8Z',M.acierSombre);
 d.vol('M5 10H27Q28 10 28 12V23Q28 25 26 25H6Q4 25 4 23V12Q4 10 5 10Z',M.creme);
 for(const y of [14,20]){
  d.vol(`M6 ${y}Q10 ${y-4} 22 ${y-2}L26 ${y-4}L25 ${y}L26 ${y+3}L22 ${y+1}Q11 ${y+4} 6 ${y}Z`,M.acier);
  d.trait(`M10 ${y}Q15 ${y-2} 22 ${y}`, '#8095A5', .7);
 }
 d.vol('M3 9Q7 3 16 4H27L27 8Z',M.acier);
 d.vol(ell(21,5.5,3,.8),M.acierSombre);
})};
