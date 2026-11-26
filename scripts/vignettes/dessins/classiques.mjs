import {M,dessiner,ell} from '../kit.mjs';
const I={};
I.safran=dessiner('safran',d=>{
 d.vol('M3 18H29Q28 29 16 29Q4 29 3 18Z',M.ceramique);d.vol(ell(16,18,13,5),M.creme);
 for(const[x,y,a]of[[8,16,0],[12,15,1],[17,17,0],[21,16,1],[24,18,0],[10,20,1],[16,21,0],[21,21,1]]){
  d.trait(`M${x-2} ${y+1}q3 -4 5 -2`,a?'#D3421D':'#9F2524',.7);
  d.trait(`M${x} ${y-1}q-1 3 -3 4`,'#EA6221',.5);
 }
});
I.anchois=dessiner('anchois',d=>{
 d.vol(ell(16,22,14,7),M.ceramique);d.vol(ell(16,21,12,4.5),M.huile);
 for(const y of [14,18,22]){
  d.vol(`M5 ${y}Q14 ${y-5} 27 ${y-1}L26 ${y+2}Q14 ${y-1} 6 ${y+3}Z`,M.brun);
  d.trait(`M8 ${y+1}Q16 ${y-2} 24 ${y}`,'#E9BE91',.7);
 }
});
export default I;
