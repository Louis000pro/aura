"use strict";
/* ─────────────────────────────────────────────────────────────────────
   LE MOTEUR DES CARTES. Un seul fragment shader, sans bibliothèque.

   Une face, c'est trois textures :
     tArt  le paysage (opaque)
     tEm   l'emblème, avec sa transparence
     tFx   R = métal (cadre, nom, gravures)  G = relief  B = vernis  A = encre

   Le relief donne une normale par pixel. Cette normale, plus l'inclinaison
   de la carte, dit quelle partie d'un studio photo le métal reflète :
   c'est ce qui fait glisser la lumière sur les lettres quand on penche.
   ───────────────────────────────────────────────────────────────────── */
(function () {
  const VERT = `#version 300 es
in vec2 p;out vec2 v;
void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 v;out vec4 o;
uniform sampler2D tArt,tFx,tEm;
uniform vec2 uTilt,uTexel;
uniform float uT;
uniform vec3 uM0,uM1,uM2,uM3,uLueur,uEncre,uI0,uI1,uI2;
uniform vec4 uEmB;      // boîte de l'emblème
uniform vec4 uF;        // x irisation, y paillettes, z soleillé, w vivant
uniform float uEm;      // 1 si un emblème est posé
uniform float uEmG;     // contraste de l'emblème
uniform float uEmF;     // début du fondu bas de l'emblème
uniform float uEmL;     // force de la lumière sur l'emblème
uniform float uLum;     // irisation des zones claires du paysage
uniform float uPar;     // force de la parallaxe
uniform float uFlash;   // l'éclair de la révélation
uniform float uScrim;   // le bas assombri, pour le titre
uniform float uBruit;   // la finesse du grain, réglée sur la définition
uniform float uFroisse; // le film froissé d'une pochette
uniform float uCoin;    // le rayon des coins

float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}

vec3 rampe(float t){t=clamp(t,0.,1.);
 return t<.34?mix(uM0,uM1,t/.34):t<.68?mix(uM1,uM2,(t-.34)/.34):mix(uM2,uM3,(t-.68)/.32);}

// Le studio : deux grandes boîtes de lumière et un dégradé de plafond.
float studio(vec2 r){
 float a=r.x*1.05+r.y*.72;
 float s=.5+.5*sin(a*3.6+.5);s=s*s*s;
 float s2=.5+.5*sin(a*8.7+2.1);s2=pow(s2,7.);
 return clamp(.3-.14*r.y+s*.72+s2*.5,0.,1.);
}
vec3 irise(float p){p=fract(p)*3.;return p<1.?mix(uI0,uI1,smoothstep(0.,1.,p)):p<2.?mix(uI1,uI2,smoothstep(1.,2.,p)):mix(uI2,uI0,smoothstep(2.,3.,p));}

float scintille(vec2 uv,float grille,vec2 t,float seuil,float vit){
 vec2 g=uv*grille;vec2 c=floor(g);vec2 r=h22(c);
 if(r.y<seuil)return 0.;
 float ph=dot(r-.5,t)*17.+r.x*6.283+uT*vit*(.5+r.x);
 float s=pow(max(.5+.5*sin(ph),0.),26.);
 vec2 f=fract(g)-.5;float d=length(f);
 float croix=max(0.,1.-abs(f.x)*9.)*max(0.,1.-abs(f.y)*2.)+max(0.,1.-abs(f.y)*9.)*max(0.,1.-abs(f.x)*2.);
 return s*(smoothstep(.34,.0,d)+croix*.5);
}

void main(){
 vec2 uv=v;vec2 q=vec2(uv.x,uv.y*1.4);
 vec2 tilt=uTilt;
 vec2 lum=tilt*vec2(1.,.82);

 // Le coin arrondi.
 vec2 d0=abs(q-vec2(.5,.7))-vec2(.5,.7)+uCoin;
 float sd=length(max(d0,0.))+min(max(d0.x,d0.y),0.)-uCoin;
 float bordAA=max(fwidth(sd)*1.2,.0004);
 float masque=1.-smoothstep(-bordAA,bordAA,sd);

 // Le paysage : une fenêtre, il glisse derrière la carte.
 vec2 uvA=(uv-.5)/1.05+.5+tilt*.011*uPar;
 if(uF.w>.5){uvA+=vec2(sin(uv.y*7.+uT*.13),cos(uv.x*6.+uT*.11))*.0016;}
 vec3 col=texture(tArt,uvA).rgb;

 if(uLum>0.){
  float L=dot(col,vec3(.3,.59,.11));
  vec2 r=lum*1.15+(q-vec2(.5,.7))*.9;
  col+=uLum*smoothstep(.2,.78,L)*irise(r.x*.7+r.y*.5+q.y*.6)*studio(r)*.42;
 }

 vec4 fx=texture(tFx,uv);

 // Le vernis : un dessin ton sur ton, visible seulement dans la lumière.
 if(fx.b>.003){
  vec2 r=(q-vec2(.5,.62))*1.4+lum*1.25;
  float b=exp(-dot(r,r)*3.2);
  col+=fx.b*b*(mix(uM2,vec3(1.),.25))*.34;
 }

 // Le soleillé : la grande lumière en nœud papillon d'un cadran de montre.
 vec2 dc=q-vec2(.5,.56);
 float ang=atan(dc.y,dc.x),ray=length(dc);
 if(uF.z>0.){
  float la=atan(lum.y+.18,lum.x+.12);
  float lobe=pow(abs(cos(ang-la)),9.);
  float fil=n2(vec2(ang*140.,ray*3.))*.5+n2(vec2(ang*62.,ray*2.+4.))*.5;
  col+=uF.z*lobe*(.45+.75*fil)*uM2*.075*smoothstep(.3,.44,ray)*smoothstep(1.05,.5,ray);
 }

 // Les paillettes du paysage.
 if(uF.y>0.){
  float s=scintille(uvA,64.,lum,.9,uF.w*.8)+.7*scintille(uvA+.37,110.,lum,.93,uF.w);
  col+=s*uF.y*mix(uM3,vec3(1.),.4)*(1.-fx.r);
 }

 // L'emblème, posé devant : il flotte, son ombre tombe sur le paysage.
 if(uEm>.5){
  vec2 eUV=(uv-uEmB.xy)/uEmB.zw-tilt*.017*uPar;
  vec2 oUV=eUV+vec2(.0,-.022)-tilt*.03*uPar;
  float ombre=textureLod(tEm,oUV,3.6).a;
  col*=1.-ombre*.6;
  float halo=textureLod(tEm,eUV,5.2).a;
  col+=uLueur*halo*halo*.2*(.8+.2*sin(uT*.8));
  if(eUV.x>0.&&eUV.x<1.&&eUV.y>0.&&eUV.y<1.){
   vec4 em=texture(tEm,eUV);
   if(uEmF<1.)em.a*=1.-smoothstep(uEmF,1.,eUV.y);
   if(em.a>.002){
    vec3 W=vec3(.3,.59,.11);
    vec3 teinte=pow(clamp(em.rgb/max(texture(tEm,eUV).a,.001),0.,1.),vec3(uEmG));
    vec3 lit=teinte;
    if(uEmL>0.){
     float e=.0028;
     float lx=dot(textureLod(tEm,eUV+vec2(e,0),1.6).rgb,W)-dot(textureLod(tEm,eUV-vec2(e,0),1.6).rgb,W);
     float ly=dot(textureLod(tEm,eUV+vec2(0,e),1.6).rgb,W)-dot(textureLod(tEm,eUV-vec2(0,e),1.6).rgb,W);
     vec3 N=normalize(vec3(-lx*1.5,-ly*1.5,1.));
     vec2 r=N.xy*2.+lum*.95+(q-vec2(.5,.62))*1.05;
     float b=studio(r);
     lit=teinte*(.71+.28*b)+uM3*pow(b,5.)*.17;
     if(uF.x>0.){
      vec3 ir=irise(r.x*.62+r.y*.46+q.y*.6+.1);
      lit=mix(lit,lit*(.7+.5*ir),uF.x*.8*smoothstep(.5,1.,dot(teinte,W)));
     }
     lit=mix(teinte,lit,uEmL);
    }
    col=mix(col,lit,em.a);
   }
  }
 }

 if(uScrim>0.)col*=1.-uScrim*smoothstep(.66,.84,uv.y);

 // Le film d'une pochette : chaque pli attrape la lumière.
 if(uFroisse>0.){
  float e=uTexel.x*2.4,f=uTexel.y*2.4;
  float hG=texture(tFx,uv-vec2(e,0)).g,hD=texture(tFx,uv+vec2(e,0)).g;
  float hH=texture(tFx,uv-vec2(0,f)).g,hB=texture(tFx,uv+vec2(0,f)).g;
  vec3 N=normalize(vec3((hG-hD)*2.6,(hH-hB)*2.6,1.));
  vec2 r=N.xy*2.+lum*1.05+(q-vec2(.5,.7))*.92;
  float b=studio(r);
  col=col*(.42+.46*b)+uM2*pow(b,3.2)*uFroisse*.5;
  if(uF.x>0.)col+=irise(r.x*.7+r.y*.5+q.y*.6)*pow(b,2.)*uF.x*.14;
 }

 // Le métal : le cadre, le nom, les gravures.
 if(fx.r>.002){
  float e=uTexel.x*1.6,f=uTexel.y*1.6;
  float hG=texture(tFx,uv-vec2(e,0)).g,hD=texture(tFx,uv+vec2(e,0)).g;
  float hH=texture(tFx,uv-vec2(0,f)).g,hB=texture(tFx,uv+vec2(0,f)).g;
  vec3 N=normalize(vec3((hG-hD)*5.2,(hH-hB)*5.2,1.));
  vec2 r=N.xy*2.+lum*1.05+(q-vec2(.5,.7))*.92;
  // la matière fine : un brossé, un grain
  float brosse=n2(vec2(uv.x*7.,uv.y*uBruit*.7));
  float grain=n2(uv*uBruit);
  r+=(brosse-.5)*.05+(grain-.5)*.04;
  float b=studio(r);
  vec3 m=rampe(b);
  if(uF.x>0.){
   vec3 ir=irise(r.x*.7+r.y*.5+q.y*.8+q.x*.3);
   m=mix(m,m*ir*1.25,uF.x);
  }
  if(uF.w>.5){
   float tour=pow(max(.5+.5*cos(ang-uT*.6),0.),24.);
   m+=tour*uM3*.5*smoothstep(.38,.42,ray)*(1.-smoothstep(.6,.64,ray));
  }
  col=mix(col,m,fx.r);
 }

 // L'encre : les petits textes.
 col=mix(col,uEncre,fx.a);

 // Le reflet de surface : le vernis général de la carte.
 vec2 pl=q-vec2(.5,.7)-lum*vec2(.62,.8);
 float gl=exp(-dot(pl,pl)*2.1);
 col+=gl*gl*vec3(1.)*.06;
 float zb=(q.x+q.y*.42)-(lum.x*.9+lum.y*.5+.86);
 col+=exp(-zb*zb*26.)*.05;

 // L'éclair de la révélation.
 if(uFlash>0.){
  float zf=(q.x+q.y*.5)-mix(-.4,2.2,uFlash);
  col+=exp(-zf*zf*30.)*vec3(1.)*.9;
 }

 // Le chant de la carte : un filet de lumière très fin.
 col+=(1.-smoothstep(.0,.004,abs(sd+.0018)))*.1;

 col=clamp(col,0.,1.);
 o=vec4(col*masque,masque);
}`;

  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const NOMS = ["tArt", "tFx", "tEm", "uTilt", "uTexel", "uT", "uM0", "uM1", "uM2", "uM3", "uLueur", "uEncre", "uEmB", "uF", "uEm", "uEmG", "uEmF", "uEmL", "uLum", "uPar", "uScrim", "uBruit", "uFroisse", "uCoin", "uFlash", "uI0", "uI1", "uI2"];

  class Carte {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
      if (!gl) throw new Error("WebGL2 absent");
      this.gl = gl;
      const mk = (t, s) => {
        const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      };
      const pr = gl.createProgram();
      gl.attachShader(pr, mk(gl.VERTEX_SHADER, VERT));
      gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const l = gl.getAttribLocation(pr, "p");
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      for (const n of NOMS) this.u[n] = gl.getUniformLocation(pr, n);
      gl.uniform1i(this.u.tArt, 0); gl.uniform1i(this.u.tFx, 1); gl.uniform1i(this.u.tEm, 2);
      this.flash = 0;
      this.vide = this._tex(null);
    }

    _tex(source, mip, w, h) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (source === null) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      else if (source instanceof Uint8Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    }

    /* Prépare une face une fois pour toutes : la retourner ne recharge rien. */
    preparer(f) {
      return {
        f,
        art: this._tex(f.art, true),
        fx: this._tex(f.fx.data, true, f.fx.w, f.fx.h),
        em: f.emblem ? this._tex(f.emblem, true) : this.vide,
      };
    }

    activer(p) {
      const gl = this.gl, u = this.u, f = p.f;
      this.active = p;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, p.art);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, p.fx);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, p.em);
      gl.uniform2f(u.uTexel, 1 / f.fx.w, 1 / f.fx.h);
      gl.uniform3fv(u.uM0, hex(f.m[0])); gl.uniform3fv(u.uM1, hex(f.m[1]));
      gl.uniform3fv(u.uM2, hex(f.m[2])); gl.uniform3fv(u.uM3, hex(f.m[3]));
      gl.uniform3fv(u.uLueur, hex(f.lueur)); gl.uniform3fv(u.uEncre, hex(f.encre));
      gl.uniform4fv(u.uEmB, f.emB || [0, 0, 1, 1]);
      gl.uniform4fv(u.uF, f.f);
      gl.uniform1f(u.uEm, f.emblem ? 1 : 0);
      gl.uniform1f(u.uEmG, f.emG || 1);
      gl.uniform1f(u.uEmF, f.emF ?? 1);
      gl.uniform1f(u.uEmL, f.emL ?? 1);
      gl.uniform1f(u.uLum, f.lum || 0);
      gl.uniform1f(u.uPar, f.par ?? 1);
      gl.uniform1f(u.uScrim, f.scrim || 0);
      gl.uniform1f(u.uFroisse, f.froisse || 0);
      gl.uniform1f(u.uCoin, f.coin ?? .046);
      const ir = f.ir || ["#FFFFFF", "#FFFFFF", "#FFFFFF"];
      gl.uniform3fv(u.uI0, hex(ir[0])); gl.uniform3fv(u.uI1, hex(ir[1])); gl.uniform3fv(u.uI2, hex(ir[2]));
    }

    liberer(p) {
      const gl = this.gl;
      gl.deleteTexture(p.art); gl.deleteTexture(p.fx);
      if (p.em !== this.vide) gl.deleteTexture(p.em);
    }

    dessiner(tx, ty, t) {
      const gl = this.gl, c = this.canvas;
      if (c.width !== this._w || c.height !== this._h) { this._w = c.width; this._h = c.height; gl.viewport(0, 0, c.width, c.height); }
      gl.uniform2f(this.u.uTilt, tx, ty);
      gl.uniform1f(this.u.uT, t);
      gl.uniform1f(this.u.uBruit, Math.min(760, c.width * .42));
      gl.uniform1f(this.u.uFlash, this.flash);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }
  window.CarteGL = Carte;
})();
