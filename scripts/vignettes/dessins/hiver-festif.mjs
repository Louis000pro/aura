// Nouveaux ingrédients du lot festif. Dessins Vaiiya avec le kit existant.
import { M, dessiner, ell, capsule } from '../kit.mjs';
const I = {};
I.topinambour = dessiner('topinambour', d => {
  const tub = {hi:'#F0D7AD',mid:'#CDA36C',lo:'#9A7144'};
  d.vol('M7 20C2 18 3 12 7 11C5 6 10 3 13 7C17 3 21 7 20 10C27 8 29 13 25 17C30 21 26 27 22 25C19 31 13 29 13 25C8 28 4 25 7 20Z',tub);
  for(const p of ['M8 13q4 1 4 4','M15 10q3 2 2 5','M19 20q3 -2 5 0','M13 22q3 -2 4 1'])d.trait(p,'#967246',0.65,0.7);
  for(const [x,y] of [[9,9],[24,14],[18,25],[9,22]])d.vol(ell(x,y,0.8,0.5),M.brun);
});
I.cardon = dessiner('cardon',d=>{
  const c={hi:'#F4F3CF',mid:'#D3DCB7',lo:'#96B18B'};
  for(const [x,y,a] of [[8,28,-2],[16,30,0],[24,27,2]]){
    const p='M'+(x-3)+' '+y+'L'+(x-2+a)+' 5Q'+(x+a)+' 3 '+(x+2+a)+' 5L'+(x+3)+' '+y+'Q'+x+' '+(y+2)+' '+(x-3)+' '+y+'Z';d.vol(p,c);
    d.trait('M'+x+' '+(y-1)+'L'+(x+a)+' 6','#FAF9DB',0.65,0.9);
    d.trait('M'+(x+1.7)+' '+(y-2)+'L'+(x+1+a)+' 7','#A8BC95',0.4,0.7);
  }
});
I.cranberries = dessiner('cranberries',d=>{
  const c={hi:'#DE6C75',mid:'#9B263B',lo:'#5F172D'};
  for(const [x,y,r] of [[10,9,4.3],[21,8,4],[16,15,4.6],[6,19,4],[25,18,4.5],[11,25,4.5],[22,26,4.2]]){
    d.vol(ell(x,y,r,r*0.78,-25),c);d.trait('M'+(x-r/2)+' '+y+'q2 -2 3 0t1 2','#6C1B30',0.55,0.7);
  }
});
I['choux-bruxelles'] = dessiner('chouxbruxelles',d=>{
  for(const [x,y,r] of [[11,12,8],[23,16,7],[13,25,6.5]]){
    d.vol(ell(x,y,r,r),M.vert); d.trait('M'+(x-r*0.7)+' '+(y+1)+'Q'+x+' '+(y+r*0.6)+' '+(x+r*0.6)+' '+(y-r*0.5),'#D6EDAE',0.7,0.8);
    d.trait('M'+(x-1)+' '+(y-r*0.8)+'Q'+(x+r*0.6)+' '+y+' '+x+' '+(y+r*0.8),'#A6D18E',0.7,0.8);
  }
});

// Trois ingrédients des lots 5 et 6 dont la vignette manquait encore.
I.pruneau = dessiner('pruneau',d=>{
  const c={hi:'#8F6A91',mid:'#50304F',lo:'#2B182C'};
  for(const [x,y,a] of [[11,12,-25],[22,20,20],[10,26,-10]]){
    d.vol(ell(x,y,6,5,a),c);
    for(const n of [-2,1])d.trait('M'+(x+n-2)+' '+(y-2)+'q3 1 1 4','#231428',0.6,0.65);
  }
});
I.biere = dessiner('biere',d=>{
  d.vol('M23 11H26Q30 12 30 18Q30 25 24 25H23V22H25Q27 21 27 18Q27 14 24 14H23Z',M.verre);
  d.vol('M5 8H24L23 28Q14 32 6 28Z',M.ambre);
  for(const x of [9,15,20])d.trait('M'+x+' 13V26','#FFDE9B',0.8,0.7);
  d.vol('M4 10C1 5 5 2 9 4C11 0 17 1 18 4C23 1 29 6 25 10C20 12 8 12 4 10Z',M.blancFroid);
});
export default I;
