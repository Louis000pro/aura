// Ingrédients du lot carte blanche, dessinés avec le kit Vaiiya.
import {M,dessiner,ell} from '../kit.mjs';
const I={};
I['feuille-brick']=dessiner('brick',d=>{for(const y of [20,17,14])d.vol(`M3 ${y}Q15 ${y-7} 29 ${y}L27 ${y+9}Q14 ${y+4} 4 ${y+9}Z`,M.creme);d.trait('M5 15Q16 10 27 15','#FFFDF6',.7);});
I.chapelure=dessiner('chapelure',d=>{d.vol('M3 20H29Q28 30 16 30Q4 30 3 20Z',M.ceramique);d.vol(ell(16,20,13,5),M.beige);for(let i=0;i<36;i++){const x=5+(i*13%22),y=17+(i*5%7);d.vol(ell(x,y,.65,.4),i%2?M.kraft:M.creme);}});
I['pate-pizza']=dessiner('patepizza',d=>{d.vol(ell(16,18,13,10),M.beige);d.vol(ell(16,16.5,11,7.7),M.creme);for(const [x,y]of[[10,14],[20,13],[15,18],[22,20],[9,20]])d.vol(ell(x,y,.5,.35),M.beige);});
I.miso=dessiner('miso',d=>{d.vol('M3 15H28L26 28Q15 32 5 28Z',M.ceramique);d.vol(ell(15.5,15,12.5,5),M.beige);d.vol('M7 15Q9 6 16 9Q22 7 24 16Q16 21 7 15Z',M.kraft);d.trait('M11 12Q17 10 21 14','#F8DCB0',1);});
I.cannelloni=dessiner('cannelloni',d=>{for(const [x,y]of[[9,12],[18,10],[21,20]]){d.vol(`M${x-6} ${y-3}L${x+5} ${y-7}L${x+9} ${y+5}L${x-3} ${y+10}Z`,M.beige);d.vol(ell(x-4.5,y+3.5,3,6),M.dore);d.vol(ell(x-4.5,y+3.5,1.8,4),M.brun);}});
I.speculoos=dessiner('speculoos',d=>{for(const [x,y]of[[4,6],[10,13]]){d.vol(`M${x+2} ${y}H${x+15}Q${x+17} ${y} ${x+17} ${y+2}V${y+15}Q${x+17} ${y+17} ${x+15} ${y+17}H${x+2}Q${x} ${y+17} ${x} ${y+15}V${y+2}Q${x} ${y} ${x+2} ${y}Z`,M.cannelle);d.trait(`M${x+3} ${y+3}H${x+14}V${y+14}H${x+3}Z`,'#8D512E',.7);d.trait(`M${x+5} ${y+9}L${x+8} ${y+5}L${x+12} ${y+9}L${x+8} ${y+12}Z`,'#F2BA81',.8);}});
I['chocolat-blanc']=dessiner('chocblanc',d=>{d.vol('M5 6L24 3L29 25L10 29Z',M.beige);for(let x=0;x<3;x++)for(let y=0;y<3;y++){const a=6+x*6+y,b=7+y*6-x;d.vol(`M${a} ${b}l4-.6 1 4.5-4 .7Z`,M.creme);}});
I['abricot-frais']=dessiner('abricotfrais',d=>{d.vol(ell(12,17,10,11),M.orange);d.trait('M13 7Q8 17 13 27','#DB7423',.8);d.vol('M10 7Q9 2 12 2L13 7Z',M.boisFonce);d.vol(ell(23,22,8,8),M.ambre);d.vol(ell(23,21,6.5,6),M.orange);d.vol(ell(23,21,3,4),M.boisFonce);});
export default I;
