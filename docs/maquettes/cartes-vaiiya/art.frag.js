// L'art des six cartes de rang : un seul paysage, « de la terre aux étoiles ».
// x va de 0 à 6 (une carte = 1), y de 0 à 1.4 (vers le bas).
window.ART_FRAG = `#version 300 es
precision highp float;
uniform float uCarte;
uniform vec2 uRes;
uniform float uLargeur; // 1 = une carte, 6 = le panorama
out vec4 o;

float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
const mat2 M=mat2(1.6,1.2,-1.2,1.6);
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<7;i++){s+=a*n2(p);p=M*p+3.1;a*=.5;}return s;}
float fbm3(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p=M*p+1.7;a*=.5;}return s;}
float crete(float x,float f,float g){float s=0.,a=.55,p=x*f+g;for(int i=0;i<7;i++){float n=n2(vec2(p,g*.37));n=1.-abs(2.*n-1.);s+=a*n*n;p*=2.03;a*=.5;}return s;}
vec3 C(float r,float g,float b){return vec3(r,g,b)/255.;}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}

float poids(float x,float i){return smoothstep(i-.1,i+.1,x)*(1.-smoothstep(i+.9,i+1.1,x));}
float etoiles(vec2 p,float cell,float dens){
 vec2 g=p*cell,i=floor(g),f=fract(g);float s=0.;
 for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 k=i+vec2(a,b);float r=h21(k);if(r>dens)continue;
  vec2 c=h22(k+7.);vec2 d=vec2(a,b)+c-f;float t=h21(k+3.);float m=pow(t,5.)*.11+.012;
  s+=smoothstep(m,0.,length(d))*(.35+.65*t);}
 return s;
}

void main(){
 vec2 uv=gl_FragCoord.xy/uRes;uv.y=1.-uv.y;
 if(uCarte>5.5){
  vec2 q=vec2(uv.x,uv.y*1.4);float d=length(q-vec2(.5,.7));vec3 col=vec3(0.);
  if(uCarte<6.5){ // le dos
   col=mix(lin(C(40.,18.,98.)),lin(C(9.,5.,24.)),smoothstep(.0,.82,d));
   vec2 p=q*1.5+2.;float e=fbm(p+2.2*vec2(fbm(p+5.),fbm(p+9.)));
   col+=lin(C(120.,56.,210.))*pow(e,3.2)*.16;
   col+=etoiles(q,40.,.5)*lin(C(255.,226.,170.))*.22+etoiles(q+2.,90.,.4)*.12;
   col*=mix(1.,.72,smoothstep(.5,1.,d));
  }else if(uCarte<7.5){ // les flammes
   col=mix(lin(C(11.,5.,4.)),lin(C(44.,14.,7.)),smoothstep(.1,1.2,q.y));
   vec2 p=vec2(q.x*2.1,q.y*1.2-.2);float e=fbm(p+1.6*vec2(fbm(p+3.),fbm(p*1.1+7.)));
   col+=lin(C(255.,110.,30.))*pow(e,3.4)*.26*smoothstep(.0,1.,q.y);
   float dg=length(q-vec2(.5,.98));
   col+=lin(C(255.,120.,30.))*exp(-dg*2.5)*.13;
   col+=lin(C(255.,190.,90.))*etoiles(vec2(q.x,q.y*.42),34.,.34)*.5*smoothstep(1.3,.3,q.y);
  }else if(uCarte<8.5){ // les programmes
   col=mix(lin(C(10.,6.,26.)),lin(C(34.,14.,78.)),smoothstep(.0,.95,q.y));
   vec2 v=q-vec2(.5,.56);float r=length(v),an=atan(v.y,v.x);
   float ray=n2(vec2(an*9.,1.))*.55+n2(vec2(an*23.,4.))*.3+n2(vec2(an*57.,7.))*.15;
   col+=lin(C(186.,128.,250.))*pow(smoothstep(.36,.8,ray),2.4)*smoothstep(.2,.42,r)*exp(-max(r-.4,0.)*1.9)*.18;
   col+=lin(C(254.,193.,117.))*exp(-abs(r-.43)*40.)*.1;
   col+=lin(C(233.,150.,212.))*exp(-pow(q.y-1.02,2.)*60.)*.1;
   col+=etoiles(q,46.,.4)*.2*smoothstep(1.,.2,q.y);
  }else if(uCarte<9.5){ // les mouvements
   float ds=length((q-vec2(.5,.62))*vec2(1.,.8));
   col=mix(lin(C(38.,28.,74.)),lin(C(9.,7.,20.)),smoothstep(.05,.8,ds));
   float sol=smoothstep(.99,1.0,q.y);
   col=mix(col,lin(C(7.,5.,15.)),sol);
   col+=lin(C(139.,92.,246.))*exp(-abs(q.y-.995)*60.)*.05;
  }else{ // le froissé d'une pochette : des facettes qui ne se raccordent pas
   vec2 p=q*7.;vec2 g=floor(p),f=fract(p);float dm=9.;vec2 best=vec2(0.);vec2 bc=vec2(0.);
   for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 k=vec2(a,b);vec2 c=h22(g+k);vec2 r=k+c-f;float dd=dot(r,r);if(dd<dm){dm=dd;best=g+k;bc=r;}}
   vec2 sl=h22(best+3.)-.5;
   float h1=dot(sl,-bc)*.9+h21(best)*.25;
   vec2 p2=q*19.+3.;g=floor(p2);f=fract(p2);dm=9.;
   for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 k=vec2(a,b);vec2 c=h22(g+k);vec2 r=k+c-f;float dd=dot(r,r);if(dd<dm){dm=dd;best=g+k;bc=r;}}
   sl=h22(best+11.)-.5;
   float h2=dot(sl,-bc)*.5;
   float v=.5+h1*.42+h2*.16+(fbm3(q*3.)-.5)*.3;
   o=vec4(vec3(v),1.);return;
  }
  col*=mix(1.,.3,smoothstep(1.,1.34,q.y));
  col=col/(1.+col*.35);col=pow(max(col,0.),vec3(1./2.2));col=mix(col,col*col*(3.-2.*col),.5);
  col+=(h21(gl_FragCoord.xy)-.5)/255.*1.6;
  o=vec4(col,1.);return;
 }
 float x=uCarte+uv.x*uLargeur;float y=uv.y*1.4;
 float w0=poids(x,0.),w1=poids(x,1.),w2=poids(x,2.),w3=poids(x,3.),w4=poids(x,4.),w5=poids(x,5.);
 w0=x<.5?1.:w0;w5=x>5.5?1.:w5;

 // Les six ciels : zénith, milieu, horizon, lueur.
 vec3 c0=w0*C(10.,5.,4.)+w1*C(6.,9.,15.)+w2*C(12.,7.,2.)+w3*C(6.,13.,18.)+w4*C(3.,6.,20.)+w5*C(4.,2.,14.);
 vec3 c1=w0*C(30.,13.,8.)+w1*C(15.,21.,31.)+w2*C(38.,23.,6.)+w3*C(8.,42.,58.)+w4*C(6.,20.,58.)+w5*C(15.,7.,48.);
 vec3 c2=w0*C(186.,86.,36.)+w1*C(108.,126.,150.)+w2*C(214.,144.,38.)+w3*C(122.,184.,186.)+w4*C(56.,126.,206.)+w5*C(126.,78.,214.);
 vec3 c3=w0*C(255.,170.,100.)+w1*C(226.,236.,250.)+w2*C(255.,226.,130.)+w3*C(226.,255.,250.)+w4*C(190.,232.,255.)+w5*C(255.,214.,140.);

 vec3 col=mix(lin(c0),lin(c1),smoothstep(0.,.95,y));
 col=mix(col,lin(c2),pow(smoothstep(.62,1.14,y),2.4)*.72);
 float cx=floor(min(x,5.999))+.5;
 vec2 ctr=vec2(cx,.6);
 float dc=length(vec2(x,y)-ctr);

 // La terre (Bronze) : un soleil bas et des nuages éclairés par en dessous.
 if(w0>0.){
  vec2 q=vec2(x*1.7,y*8.5);float e=fbm(q+1.4*fbm(q*.6+4.));
  float b=pow(smoothstep(.36,.8,e),2.)*smoothstep(.5,1.02,y)*(1.-smoothstep(1.04,1.2,y));
  col+=w0*b*lin(c2)*.26;
  col+=w0*pow(smoothstep(.54,.86,e),3.)*smoothstep(.76,1.05,y)*lin(c3)*.14;
  float d=length(vec2(x,y)-vec2(.5,1.1));
  col=mix(col,mix(lin(C(70.,28.,12.)),lin(C(240.,128.,60.)),smoothstep(.66,1.06,y)),w0*smoothstep(.5,.485,d)*.9);col+=w0*lin(c3)*.05*exp(-max(d-.48,0.)*3.5);
  float a=atan(y-1.1,x-.5);
  float ray=pow(smoothstep(.36,.84,n2(vec2(a*11.,1.))*.6+n2(vec2(a*27.,4.))*.4),2.);
  col+=w0*lin(c2)*ray*exp(-max(d-.48,0.)*2.1)*.13;
 }
 // La brume (Argent) : un croissant de lune autour de l'emblème, des bancs de brume.
 if(w1>0.){
  vec2 c=vec2(1.5,.56);float d=length(vec2(x,y)-c);float r=.43;
  float d2=length(vec2(x,y)-c-vec2(.05,.06));
  float crois=smoothstep(r,r-.005,d)*smoothstep(.0,.03,d2-r*.965);
  float mers=fbm(vec2(x,y)*9.+2.)*.6+fbm(vec2(x,y)*3.2+9.)*.4;
  vec3 lune=lin(C(236.,242.,250.))*(.34+.5*smoothstep(.34,.64,mers));
  col=mix(col,lin(C(10.,14.,21.)),smoothstep(r,r-.005,d)*.8*w1);
  col=mix(col,lune,crois*w1);
  col+=w1*lin(c3)*(.05*exp(-max(d-r,0.)*6.)+.012*exp(-max(d-r,0.)*1.8))*(1.-smoothstep(r,r-.01,d));
  col+=w1*lin(c3)*.006*exp(-d*2.);
  vec2 q=vec2(x*2.1,y*7.);float b=fbm(q+1.5*fbm(q*.7+11.));
  col=mix(col,lin(C(150.,166.,190.))*.22,w1*pow(smoothstep(.42,.82,b),1.8)*smoothstep(.74,1.08,y)*.7);
 }
 // Le soleil (Or) : une couronne de rayons autour de l'emblème.
 if(w2>0.){
  vec2 c=vec2(2.5,.56);vec2 v=vec2(x,y)-c;float d=length(v);float a=atan(v.y,v.x);
  float ray=n2(vec2(a*8.,1.))*.55+n2(vec2(a*21.,4.))*.3+n2(vec2(a*53.,7.))*.15;
  ray=pow(smoothstep(.34,.8,ray),2.4);
  float ext=smoothstep(.26,.44,d);
  col+=w2*lin(c2)*ray*ext*exp(-max(d-.4,0.)*1.7)*.2;
  col+=w2*lin(c3)*(.1*exp(-abs(d-.41)*16.)+.012*exp(-d*2.4));
  col=mix(col,col*.3,w2*(1.-smoothstep(.2,.4,d)));
  vec2 q=vec2(x*1.8,y*7.5);float e=fbm(q+1.2*fbm(q*.7+6.));
  col+=w2*pow(smoothstep(.44,.84,e),2.)*smoothstep(.8,1.1,y)*lin(c2)*.14;
 }
 // Les nuages (Platine) : une gloire nacrée et une mer de nuages.
 if(w3>0.){
  vec2 p=vec2(x*1.25,y*2.6);float e=fbm(p+1.6*vec2(fbm(p+3.),fbm(p+8.)));
  float lit=smoothstep(.36,.74,e);
  vec3 irid=.5+.5*cos(6.283*(e*2.4+y*.9+vec3(.0,.33,.66)));
  col+=w3*lit*smoothstep(.02,.95,y)*(mix(lin(c3),irid*irid,.5))*.085;
  float d=length(vec2(x,y)-vec2(3.5,.56));
  vec3 anneau=.5+.5*cos(6.283*(d*3.2+.15+vec3(.0,.33,.66)));
  col+=w3*mix(lin(c3),anneau*anneau,.55)*exp(-abs(d-.43)*14.)*.16;
  col+=w3*lin(c3)*.1*exp(-abs(d-.43)*44.);
  col+=w3*lin(c3)*.008*exp(-d*2.2);
 }
 // La haute atmosphère (Diamant) : l'aurore.
 if(w4>0.){
  for(int k=0;k<3;k++){
   float g=float(k)*2.7+1.3;
   float xx=x*1.3+.5*fbm3(vec2(x*.8+g,g));
   float y0=.86+.2*(fbm3(vec2(xx*1.15+g,2.))-.5)*2.+float(k)*.05;
   float t=(y0-y);
   float raies=pow(n2(vec2(xx*40.+g,1.))*.5+n2(vec2(xx*13.+g,5.))*.3+n2(vec2(xx*90.+g,9.))*.2,1.8);
   float h=smoothstep(-.14,.02,t)*exp(-max(t,0.)*(1.9-float(k)*.3));
   vec3 ca=mix(C(120.,255.,236.),C(70.,140.,255.),clamp(t*1.9,0.,1.));
   ca=mix(ca,C(170.,100.,255.),clamp((t-.34)*2.2,0.,1.));
   col+=w4*lin(ca)*h*(.02+.34*raies)*(.8-float(k)*.16);
  }
 }
 // Les étoiles (Éternel) : la nébuleuse et l'éclipse.
 if(w5>0.){
  vec2 p=vec2(x*1.1+2.,y*1.1);vec2 q=vec2(fbm(p+1.),fbm(p+vec2(5.2,1.3)));
  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)),fbm(p+3.*q+vec2(8.3,2.8)));
  float e=fbm(p+3.4*r);
  vec3 neb=mix(lin(C(38.,14.,120.)),lin(C(150.,50.,170.)),smoothstep(.36,.74,e));
  neb=mix(neb,lin(C(240.,170.,90.)),pow(smoothstep(.58,.9,e),2.));
  col+=w5*neb*pow(e,2.6)*.42*smoothstep(1.2,.2,y);
  float d=length(vec2(x,y)-vec2(5.5,.56));
  col=mix(col,lin(C(4.,2.,12.)),w5*smoothstep(.42,.4,d)*.9);
  float an=atan(y-.56,x-5.5);
  float cor=.55+.45*n2(vec2(an*5.,3.))*n2(vec2(an*17.,8.))*2.;
  col+=w5*lin(C(255.,220.,150.))*exp(-abs(d-.41)*60.)*.7;
  col+=w5*lin(C(255.,190.,110.))*exp(-max(d-.41,0.)*9.)*cor*smoothstep(.39,.41,d)*.12;
  col+=w5*lin(C(170.,110.,255.))*exp(-max(d-.41,0.)*2.8)*smoothstep(.39,.41,d)*.035;
 }

 // Les étoiles, de plus en plus nombreuses en montant.
 float den=mix(.1,.95,smoothstep(.0,5.,x));
 float haut=1.-smoothstep(.55,1.05,y);
 float st=etoiles(vec2(x,y),46.,den*.5)+.7*etoiles(vec2(x,y)+3.,110.,den*.42);
 col+=st*haut*mix(vec3(1.),lin(c3),.4)*mix(.18,.6,smoothstep(0.,5.,x));

 // Les crêtes : la terre, qui s'éloigne quand on monte.
 float eloigne=smoothstep(2.3,3.7,x);
 vec3 brume=w0*C(70.,31.,16.)+w1*C(42.,52.,66.)+w2*C(82.,54.,13.)+w3*C(40.,70.,74.)+w4*C(14.,36.,80.)+w5*C(20.,11.,60.);
 vec3 terre=w0*C(10.,5.,3.)+w1*C(6.,8.,12.)+w2*C(10.,6.,2.)+w3*C(6.,11.,13.)+w4*C(3.,7.,18.)+w5*C(4.,2.,14.);
 for(int k=0;k<5;k++){
  float t=float(k)/4.;
  float g=float(k)*5.3+2.1;
  float f=mix(.9,1.5,t);
  float base=.93+t*.27+eloigne*.62;
  float amp=mix(.34,.2,t);
  float yy=base-amp*crete(x,f,g)+amp*.42;
  float e=fwidth(y)*1.2;
  float m=smoothstep(yy-e,yy+e,y);
  vec3 cc=mix(lin(brume),lin(terre),pow(t,.75));
  // brouillard dans les vallées
  float fog=exp(-(y-yy)*mix(5.,9.,t));
  cc+=lin(c2)*fog*mix(.07,.015,t)*(1.-eloigne);
  col=mix(col,cc,m);
  float rim=smoothstep(.0,.004,y-yy)*smoothstep(.012,.004,y-yy);
  col+=rim*lin(c3)*mix(.02,.006,t)*(1.-eloigne);
 }

 // La mer de nuages, du Platine au Diamant.
 float mer=(1.-smoothstep(3.9,4.35,x))*smoothstep(2.8,3.25,x);
 if(mer>0.){
  vec2 p=vec2(x*2.6,(y-1.)*5.2);float e=fbm(p+1.2*fbm(p*.7+2.));
  float top=1.0+.1*(fbm3(vec2(x*2.6,3.))-.5)+.12*smoothstep(3.6,4.7,x);
  float m=smoothstep(.0,.05,y-top+(e-.5)*.26);
  vec3 cc=mix(lin(c3)*.95,lin(c2)*.42,smoothstep(.0,.3,y-top));
  cc*=.34+.5*smoothstep(.3,.72,e);
  col=mix(col,cc,m*mer);
 }

 // La courbe de la terre et son lever de soleil, vus d'en haut.
 float orbe=smoothstep(4.97,5.05,x);
 if(orbe>0.){
  vec2 c=vec2(5.5,3.32);float R=2.28;
  float d=length(vec2(x,y)-c)-R;
  float e=fwidth(y)*1.2;
  float arc=exp(-max(d,0.)*5.);
  float fin=exp(-max(d,0.)*26.);
  vec3 logo=mix(lin(C(254.,193.,117.)),lin(C(249.,159.,176.)),smoothstep(.0,.05,d));
  logo=mix(logo,lin(C(186.,128.,250.)),smoothstep(.04,.2,d));
  float bout=smoothstep(4.97,5.06,x);
  col+=orbe*logo*(arc*.2+fin*1.5)*bout*step(0.,d+.002);
  vec3 sous=lin(C(5.,3.,16.));
  sous+=lin(C(60.,36.,120.))*exp(d*9.)*.8;
  sous+=lin(C(254.,193.,117.))*exp(d*42.)*1.5;
  col=mix(col,sous,orbe*smoothstep(e,-e,d));
 }

 // Le bas de la carte reste sombre pour le nom.
 col*=mix(1.,.22,smoothstep(.98,1.32,y));
 // Vignette légère
 vec2 v=uv-.5;col*=1.-dot(v,v)*.5;

 col=col/(1.+col*.35);        // doux écrêtage des hautes lumières
 col=pow(max(col,0.),vec3(1./2.2));col=mix(col,col*col*(3.-2.*col),.55);
 col+=(h21(gl_FragCoord.xy)-.5)/255.*1.6; // grain anti-bandes
 o=vec4(col,1.);
}`;
