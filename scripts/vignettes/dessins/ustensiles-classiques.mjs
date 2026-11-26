import {M,dessiner,ell} from '../kit.mjs';
const U={};
U.mortier=dessiner('mortier',d=>{
 d.vol('M4 16H28L25 27Q16 31 7 27Z',M.acierSombre);d.vol(ell(16,16,12,5),M.fonte);
 d.vol('M15 19L23 4Q25 1 28 4Q30 5 28 8L20 22Z',M.acier);d.trait('M23 6L17 18','#F9F8FB',1);
 d.trait('M8 20Q10 26 16 27','#D3CBDD',.8);
});
U.chalumeau=dessiner('chalumeau',d=>{
 d.vol('M9 15H22V28Q16 32 9 28Z',M.bleu);d.vol(ell(15.5,15,6.5,2),M.acier);
 d.vol('M13 15V9H21L27 13L25 16L19 12H17V15Z',M.fonte);d.vol('M11 9V6H17V9Z',M.rouge);
 d.vol('M26 13Q29 7 31 9Q32 12 28 15Z',M.bleu);d.vol('M27 13Q30 10 30 11L28 14Z',M.verre);
 d.trait('M11 19V25','#BFE9FF',1);
});
export default U;
