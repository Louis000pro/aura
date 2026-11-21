// Petits ustensiles de pâtisserie du lot festif.
import { M, dessiner, ell, capsule } from '../kit.mjs';
const U={};
U.rouleau=dessiner('rouleau',d=>{d.vol(capsule(3.5,28.5,28.5,3.5,1.4),M.boisFonce);d.vol(capsule(10,22,22,10,4.5),M.bois);d.trait('M9 21L21 9','#FFE1B5',0.65,0.8);});
U['emporte-piece']=dessiner('emportepiece',d=>{const p='M16 3L20 11L29 12L23 19L25 29L16 24L7 29L9 19L3 12L12 11Z';d.trait(p,'#898699',2.8);d.trait(p,'#E8E6EF',1.3);});
U['billes-cuisson']=dessiner('billescuisson',d=>{
 d.vol('M3 17H29Q28 29 16 30Q4 29 3 17Z',M.ceramique);
 d.vol(ell(16,17,13,4),{hi:'#D9D1E7',mid:'#AAA0BB',lo:'#827591'});
 for(const [x,y] of [[8,15],[15,13],[23,15],[6,19],[13,18],[21,19],[17,23]])d.vol(ell(x,y,3.3,3),M.blancFroid);
});
export default U;
