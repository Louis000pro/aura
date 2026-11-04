/* ═══ LE LOGO EN FOND ═══
   Un seul triangle, un seul programme : tout se calcule dans le fragment.
   Aucune bibliothèque. Le fond dessine la nuit, les étoiles et le logo ;
   le passage vers le jour est un dégradé CSS, dans le module de la page.

   ⚠️ IL NE PÈSE QUE SUR L'ÉCRAN QUI LE MONTRE. Il s'arrête hors de l'écran,
   il baisse sa définition si l'appareil descend sous 24 images par seconde,
   il dessine à 30 images par seconde sur un écran tactile (ce qui bouge ici
   est lent, et la batterie compte), et il ne dessine qu'une image fixe si la
   personne a coupé les animations ou si l'appareil est faible.

   La silhouette vient d'une mesure ligne à ligne de `public/logo-vaiiya.png`
   (centre, demi-largeur et angle de la branche, en polynômes). L'éventail est
   fait de copies de la branche tournées autour du point : toutes les lignes
   convergent vers Nora et Sasha, c'est l'intention du logo. */

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uP;       /* le point du logo, en pixels du canevas */
uniform float uS;      /* pixels par hauteur de V */
uniform float uX;      /* étirement horizontal (téléphone) */
uniform float uT;      /* temps */
uniform float uNeon;   /* 0 branches pleines, 1 néon évidé */
uniform float uRond;   /* 1 : on dessine le point du logo */
uniform float uOuvre;  /* 0 à 1 : la page défile, l'éventail s'ouvre */
uniform vec3 uMain;    /* x, y en unités de V, force : la souris */
uniform float uNe;     /* 0 à 2 : les branches poussent depuis le point */
uniform float uJour;   /* 0 nuit noire, 1 plein jour */
uniform float uAllume; /* le néon : 0 éteint, 1 allumé */
uniform float uPr;     /* pixels du canevas par pixel d'écran */

float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
float hs(vec2 p){ return fract(sin(dot(mod(p,1024.),vec2(12.9898,78.233)))*43758.5453); }
float bruit(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }

/* La branche du logo, mesurée ligne à ligne sur le fichier d'origine. */
float cH(float h){ return .0049+h*(-.0102+h*(2.8132+h*(-8.9633+h*(15.8277+h*(-11.6661+h*2.7679))))); }
float wH(float h){ return .003+h*(.1116+h*(.5933+h*(-2.745+h*(5.2046+h*(-4.7676+h*1.6051))))); }
float tR(float r){ r=min(r,1.25); return .1846+r*(.7687+r*(-1.0606+r*(1.5175+r*(-.9162+r*.1466)))); }

/* Les couleurs du logo, de la pointe aux bouts des branches. */
vec3 degrade(float k){
  vec3 a=vec3(1.,.76,.50), b=vec3(.97,.56,.68), c=vec3(.78,.36,.93), d=vec3(.50,.35,.97);
  if(k<.33) return mix(a,b,k/.33);
  if(k<.66) return mix(b,c,(k-.33)/.33);
  return mix(c,d,clamp((k-.66)/.34,0.,1.));
}

/* Des étoiles fines : c'est ce qui fait de ce noir une nuit. */
float etoiles(vec2 fc){
  vec2 g=floor(fc/9.);
  float h=hs(g+3.);
  if(h<.972) return 0.;
  vec2 o=fract(fc/9.)-.5-(vec2(hs(g+11.),hs(g+29.))-.5)*.7;
  float d=length(o);
  float vit=.5+.5*sin(uT*(.5+h*2.)+h*90.);
  return (1.-smoothstep(.02,.16,d))*(.32+.68*vit)*((h-.972)/.028);
}

void main(){
  vec2 q=(gl_FragCoord.xy-uP)/uS;
  vec2 p=vec2(abs(q.x)/uX,q.y);
  float r=length(p), th=atan(p.x,p.y);
  float t=uT;
  float gr=hs(floor(gl_FragCoord.xy));
  float main_=uMain.z*exp(-dot(q-uMain.xy,q-uMain.xy)*7.);

  float a=0.; vec3 col=degrade(clamp(r*.8,0.,1.));

  /* Sous le logo, il n'y a que du ciel : on s'épargne tout ce calcul. */
  if(q.y>-.42){

  /* L'ÉVENTAIL : des copies tournées de la branche, toutes vers le même point. */
  float pas=.205;
  float s=(th-tR(r)-.075-uOuvre*.2-.012*sin(t*.3))/pas;
  float id=floor(s), f=fract(s);
  if(id>=0.&&id<7.){
    float sd=h11(id+3.);
    float v=.5+.5*sin(r*3.2+t*.5+sd*6.28);
    v=smoothstep(.05,1.,v);
    float n=bruit(vec2(r*1.5-t*.05,id*.8+sd*3.+t*.015));
    float cote2=f*f*(.4+.6*f);
    float env=smoothstep(.03,.28,r)*(1.-smoothstep(.95,2.3,r))*pow(.8,id);
    float l=smoothstep(.975,1.,f)*.55;
    a=(cote2*(.32+.68*v)*mix(.3,1.,smoothstep(.22,.78,n))+l*v*.6+cote2*main_*.5)*env*(.62+.38*sd);
    col=degrade(clamp(r*.8+.06*(sd-.5),0.,1.));
    col=mix(vec3(.30,.22,.86),col,smoothstep(.0,.42,a));
    a*=1.-smoothstep(uNe*1.4-.4,uNe*1.4,r);
  }

  /* LA SILHOUETTE EXACTE DU LOGO. */
  float h=p.y;
  float hc=clamp(h,0.,1.);
  float cc=cH(hc)-.0049*(1.-hc), ww=max(wH(hc)-.003*(1.-hc),0.);
  float pente=sqrt(1.+pow((cH(hc+.012)-cH(hc-.012))/.024,2.));
  float dd=(abs(p.x-cc)-ww)/pente;
  if(h<0.) dd=max(dd,-h);
  if(h>1.) dd=max(dd,h-1.);
  float px=1./(uS*uX);
  float pousse=1.-smoothstep(uNe-.1,uNe+.02,h);
  float tete=exp(-pow((h-uNe+.05)*16.,2.))*step(uNe,1.25);
  float m=(1.-smoothstep(-px,px,dd))*pousse;
  float dehors=max(dd,0.);
  vec3 cl=degrade(h);
  float vagueH=.5+.5*sin(h*7.+t*.75);
  float balaye=exp(-pow((fract(h*.5+t*.06)-.5)*7.,2.));

  float halo=exp(-dehors*7.)*.5*smoothstep(0.,.07,h)*(1.-smoothstep(1.,1.25,h));
  if(uNeon>.5) halo*=.55*uAllume;
  halo*=pousse;
  if(halo>0.){ col=mix(col,cl,smoothstep(0.,1.,halo/(a+halo+1e-4))); a=max(a,a*.6+halo*(.45+.55*vagueH)+halo*main_); }

  if(uNeon<.5){
    if(m>0.){
      float u=(p.x-cc)/max(ww,1e-3);
      float cotes=fract((u*.5+.5)*3.+t*.022+h*.5);
      float cote3=pow(cotes,1.6);
      vec3 c2=cl*mix(.72,1.,cote3)*(.82+.18*vagueH);
      c2=mix(c2,vec3(1.,.97,.93),balaye*.5);
      c2=mix(c2,vec3(1.,.97,.94),tete*.8);
      col=mix(col,c2,m);
      a=mix(a,mix(.94,1.,balaye),m);
    }
    float bord=(1.-smoothstep(0.,px*1.6,abs(dd)))*pousse;
    if(bord>0.){ col=mix(col,vec3(1.,.93,.97),bord*.8); a=max(a,bord); }
  } else {
    /* LE NÉON : les branches évidées, le contour allumé, une comète qui en fait le tour. */
    float ad=abs(dd);
    float cote4=p.x>cc?0.:1.;
    float u=cote4<.5?hc*.5:1.-hc*.5;
    float comete=exp(-pow((fract(u-t*.09)-.5)*11.,2.));
    float large=px*3.4;
    float trait=(1.-smoothstep(large*.5,large*1.25,ad))*pousse*uAllume;
    float aura=(exp(-ad*38.)*.95+exp(-ad*10.)*.4)*pousse*uAllume;
    vec3 cn=mix(degrade(h*.92+.06),vec3(1.,.96,.98),.1+.72*comete);
    col=mix(col,cn,clamp(trait+aura*.8,0.,1.));
    a=max(a,max(trait,aura*(.5+.5*comete+.2)));
    if(m>0.){ a=max(a,.09*m*uAllume); }
    /* éteint, le tube se devine encore */
    float tube=(1.-smoothstep(large*.5,large*1.25,ad))*(1.-uAllume);
    if(tube>0.){ col=mix(col,vec3(.42,.34,.56),tube); a=max(a,tube*.5); }
  }

  /* LE POINT DU LOGO. */
  if(uRond>.5){
    float dt=length(vec2(q.x/uX,q.y+.1069));
    if(uNeon>.5){
      float ad=abs(dt-.0549);
      float large=px*3.4;
      float trait=(1.-smoothstep(large*.5,large*1.25,ad));
      float aura=exp(-ad*38.)*.95;
      vec3 cn=mix(mix(vec3(.42,.34,.56),degrade(0.),uAllume),vec3(1.,.96,.9),.16*uAllume);
      col=mix(col,cn,clamp(trait+aura*uAllume,0.,1.));
      a=max(a,max(trait*mix(.5,1.,uAllume),aura*.6*uAllume));
    } else {
      float rond=1.-smoothstep(.0529,.0569,dt);
      if(rond>0.){ col=mix(col,degrade(0.),rond); a=max(a,rond); }
    }
  }

  a*=smoothstep(mix(-.3,-.42,uRond),mix(-.02,-.2,uRond),q.y);
  }

  float gros=.04+.07*smoothstep(0.,.5,a)*(1.-smoothstep(.6,1.,a));
  a=clamp(a+(gr-.5)*gros*2.,0.,1.);

  vec3 fond=vec3(.043,.031,.082);
  if(uJour<.65) fond+=vec3(.9,.86,1.)*etoiles(gl_FragCoord.xy/uPr)*(1.-smoothstep(.1,.65,uJour))*.85;
  /* les rayons s'ajoutent à la nuit */
  vec3 f2=vec3(1.)-(vec3(1.)-clamp(fond,0.,1.))*(vec3(1.)-clamp(col*a*1.15,0.,1.));
  f2+=(gr-.5)*.024;
  gl_FragColor=vec4(f2,1.);
}
`;

const UNIFORMES = ["uP", "uS", "uX", "uT", "uNeon", "uRond", "uOuvre", "uMain", "uNe", "uJour", "uAllume", "uPr"] as const;

export type Reglage = { neon: number; rond: number; ouvre: number; jour: number; allume: number };
export type Place = (largeur: number, hauteur: number) => { x: number; y: number; S: number; X: number };

export type Fond = {
  regler(x: Partial<Reglage>): void;
  viser(x: number, y: number, z: number): void;
  demarrer(): void;
  arreter(): void;
  detruire(): void;
};

export function creerFond(canvas: HTMLCanvasElement, place: Place, depart: Partial<Reglage>, fixe: boolean): Fond | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;
  const contexte = gl;

  let U = {} as Record<(typeof UNIFORMES)[number], WebGLUniformLocation | null>;

  function preparer(): boolean {
    const compiler = (type: number, source: string) => {
      const o = contexte.createShader(type);
      if (!o) return null;
      contexte.shaderSource(o, source);
      contexte.compileShader(o);
      return o;
    };
    const prog = contexte.createProgram();
    const vert = compiler(contexte.VERTEX_SHADER, VERT);
    const frag = compiler(contexte.FRAGMENT_SHADER, FRAG);
    if (!prog || !vert || !frag) return false;
    contexte.attachShader(prog, vert);
    contexte.attachShader(prog, frag);
    contexte.linkProgram(prog);
    if (!contexte.getProgramParameter(prog, contexte.LINK_STATUS)) {
      console.error("Vitrine : le fond du logo ne compile pas.", contexte.getShaderInfoLog(frag));
      return false;
    }
    contexte.useProgram(prog);
    contexte.bindBuffer(contexte.ARRAY_BUFFER, contexte.createBuffer());
    contexte.bufferData(contexte.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), contexte.STATIC_DRAW);
    const a = contexte.getAttribLocation(prog, "a");
    contexte.enableVertexAttribArray(a);
    contexte.vertexAttribPointer(a, 2, contexte.FLOAT, false, 0, 0);
    U = Object.fromEntries(UNIFORMES.map((n) => [n, contexte.getUniformLocation(prog, n)])) as typeof U;
    contexte.clearColor(0, 0, 0, 0);
    return true;
  }
  if (!preparer()) return null;

  const r: Reglage = { neon: 0, rond: 0, ouvre: 0, jour: .2, allume: 1, ...depart };
  const pasImage = matchMedia("(pointer: coarse)").matches ? 32 : 15;
  let w = 0, h = 0, pr = 0, temps = 8, raf = 0, actif = false, avant = 0;
  /* À la première apparition, les branches poussent depuis le point : il n'y
     a donc aucune image à remplacer au premier affichage. */
  let ne = fixe ? 2 : 0;
  let debut = 0, nb = 0, somme = 0;
  let geo: ReturnType<Place> | null = null;
  const main = { x: 0, y: 0, z: 0, cx: 0, cy: 0, cz: 0 };

  function mesurer() {
    const b = canvas.getBoundingClientRect();
    w = Math.max(1, b.width);
    h = Math.max(1, b.height);
    pr = Math.min(pr || 9, Math.min(devicePixelRatio || 1, 1.5));
    canvas.width = Math.round(w * pr);
    canvas.height = Math.round(h * pr);
    contexte.viewport(0, 0, canvas.width, canvas.height);
    /* Tout ce qui ne dépend que de la taille se lit ici, pas à chaque image. */
    geo = place(w, h);
    dessiner();
  }

  function dessiner() {
    const p = geo;
    if (!p) return;
    contexte.clear(contexte.COLOR_BUFFER_BIT);
    contexte.uniform1f(U.uJour, r.jour);
    contexte.uniform1f(U.uAllume, r.allume);
    contexte.uniform1f(U.uPr, pr);
    contexte.uniform2f(U.uP, p.x * pr, (h - p.y) * pr);
    contexte.uniform1f(U.uS, p.S * pr);
    contexte.uniform1f(U.uX, p.X);
    contexte.uniform1f(U.uT, temps);
    contexte.uniform1f(U.uNeon, r.neon);
    contexte.uniform1f(U.uRond, r.rond);
    contexte.uniform1f(U.uOuvre, r.ouvre);
    contexte.uniform1f(U.uNe, ne);
    contexte.uniform3f(U.uMain, (main.x - p.x) / p.S, (p.y - main.y) / p.S, main.z);
    contexte.drawArrays(contexte.TRIANGLES, 0, 3);
  }

  function boucle(n: number) {
    raf = 0;
    if (!actif) return;
    const dt = n - avant;
    if (dt >= pasImage) {
      avant = n;
      if (dt < 120) {
        temps += dt / 1000;
        nb++;
        somme += dt;
        if (nb === 50) {
          if (somme / nb > 42 && pr > .75) { pr = pr > 1 ? 1 : .75; mesurer(); }
          nb = 0;
          somme = 0;
        }
      }
      if (ne < 2) {
        if (!debut) debut = n;
        ne = 2 * Math.pow(Math.min(1, (n - debut) / 3000), 1.2);
      }
      main.x += (main.cx - main.x) * .08;
      main.y += (main.cy - main.y) * .08;
      main.z += (main.cz - main.z) * .05;
      dessiner();
    }
    raf = requestAnimationFrame(boucle);
  }

  const arreter = () => {
    actif = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const demarrer = () => {
    if (fixe || actif) return;
    actif = true;
    avant = performance.now();
    raf = requestAnimationFrame(boucle);
  };

  /* Un téléphone peut reprendre le contexte d'une page en arrière-plan : on le
     rebâtit au retour, sinon le logo ne reviendrait plus. */
  const fini = new AbortController();
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }, { signal: fini.signal });
  canvas.addEventListener("webglcontextrestored", () => {
    if (!preparer()) return;
    mesurer();
    if (actif) raf = requestAnimationFrame(boucle);
  }, { signal: fini.signal });

  /* Le premier rappel de l'observateur arrive avec la taille déjà mesurée. */
  const ro = new ResizeObserver(() => {
    const b = canvas.getBoundingClientRect();
    if (b.width !== w || b.height !== h) mesurer();
  });
  ro.observe(canvas);
  mesurer();

  return {
    /* Une valeur qui ne change pas ne coûte aucune image : le défilement
       appelle ceci à chaque image, y compris une fois le héros parti. */
    regler(x) {
      let change = false;
      for (const k of Object.keys(x) as (keyof Reglage)[]) {
        const v = x[k];
        if (v !== undefined && v !== r[k]) {
          r[k] = v;
          change = true;
        }
      }
      if (change && !actif) dessiner();
    },
    viser(x, y, z) {
      main.cx = x;
      main.cy = y;
      main.cz = z;
    },
    demarrer,
    arreter,
    detruire() {
      arreter();
      ro.disconnect();
      fini.abort();
      contexte.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
