import {M,dessiner,ell} from '../kit.mjs';
const U={};
U.gaufrier=dessiner('gaufrier',d=>{d.vol('M3 17L25 14L30 24L9 29L3 24Z',M.acierSombre);d.vol('M5 17L24 16L28 23L10 27Z',M.fonte);d.vol('M3 16L5 3L25 2L25 14Z',M.acier);d.vol('M6 13L7 5L23 4L23 12Z',M.fonte);for(const y of [6,9,12])d.trait(`M7 ${y}L23 ${y-1}`,'#A99CB0',.5);for(const x of [9,13,17,21])d.trait(`M${x} 5V13`,'#A99CB0',.5);for(const y of [18,21,24])d.trait(`M8 ${y}L25 ${y-2}`,'#A99CB0',.45);for(const x of [10,14,18,22])d.trait(`M${x} 17L${x+2} 25`,'#A99CB0',.45);d.vol(ell(7,24,1,1),M.rouge);d.trait('M11 28L22 26','#ECE5F3',2);});
U['poche-douille']=dessiner('pochedouille',d=>{d.vol('M4 5Q13 1 24 6L19 25L15 28L11 23Z',M.creme);d.vol('M15 25L20 25L18 31L14 30Z',M.acier);d.trait('M8 7Q10 16 14 22','#D7BA95',1);});
export default U;
