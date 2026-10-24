/**
 * Les particules de la scène de passage : la lumière qui converge vers la
 * gemme pendant la charge, les éclats de l'ancienne gemme à l'éclat, puis
 * les étincelles du nouveau rang qui montent doucement.
 *
 * Un seul canvas, une seule boucle d'images, arrêtée au démontage. Rien de
 * tout ça ne tourne quand il faut réduire les animations : la scène ne crée
 * alors pas ce moteur.
 */

type Particule =
  | { k: "conv"; a: number; d: number; t: number; vie: number; s: number; col: string }
  | { k: "eclat"; x: number; y: number; vx: number; vy: number; t: number; vie: number; s: number; rot: number; vr: number; col: string }
  | { k: "etinc"; x: number; y: number; vx: number; vy: number; t: number; vie: number; s: number; col: string; ph: number };

export type MoteurParticules = {
  taux: (k: "conv" | "etinc", v: number) => void;
  eclats: (couleurs: string[], n: number) => void;
  arreter: () => void;
};

const MAX = 420;

export function moteurParticules(
  canvas: HTMLCanvasElement,
  centre: () => { x: number; y: number; h: number },
  palette: string[],
  eternel: boolean,
): MoteurParticules {
  const c = canvas.getContext("2d");
  let W = 1, H = 1, liste: Particule[] = [], dernier = 0, raf = 0;
  const taux = { conv: 0, etinc: 0 }, acc = { conv: 0, etinc: 0 };
  const au = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

  const dimensionner = () => {
    const b = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, b.width); H = Math.max(1, b.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(dimensionner) : null;
  ro?.observe(canvas);
  dimensionner();

  const naitConv = () => {
    const a = Math.random() * Math.PI * 2;
    const d = (0.42 + Math.random() * 0.62) * Math.max(W, H) * 0.6;
    liste.push({ k: "conv", a, d, t: 0, vie: 0.48 + Math.random() * 0.42, s: 0.9 + Math.random() * 1.7, col: Math.random() < 0.5 ? "#FFFFFF" : au(palette) });
  };
  const naitEtinc = (ct: { x: number; y: number }) => {
    const a = Math.random() * Math.PI * 2;
    const r = (eternel ? 0.1 + Math.random() * 0.75 : 0.12 + Math.random() * 0.5) * W;
    liste.push({
      k: "etinc", x: ct.x + Math.cos(a) * r, y: ct.y + Math.sin(a) * r * 0.9,
      vx: (Math.random() - 0.5) * 10, vy: -(10 + Math.random() * 26), t: 0,
      vie: 2.2 + Math.random() * 1.9, s: 1.4 + Math.random() * 2.8, col: au(palette), ph: Math.random() * 6,
    });
  };
  const etoile = (x: number, y: number, s: number) => {
    if (!c) return;
    const L = s * 2.3, w = s * 0.34;
    c.beginPath(); c.moveTo(x, y - L); c.lineTo(x + w, y); c.lineTo(x, y + L); c.lineTo(x - w, y); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - L, y); c.lineTo(x, y + w); c.lineTo(x + L, y); c.lineTo(x, y - w); c.closePath(); c.fill();
  };

  const boucle = (t: number) => {
    raf = requestAnimationFrame(boucle);
    if (!c) return;
    const dt = Math.min(0.05, (t - dernier) / 1000 || 0.016);
    dernier = t;
    const ct = centre();
    acc.conv += taux.conv * dt;
    while (acc.conv >= 1) { acc.conv -= 1; if (liste.length < MAX) naitConv(); }
    acc.etinc += taux.etinc * dt;
    while (acc.etinc >= 1) { acc.etinc -= 1; if (liste.length < MAX) naitEtinc(ct); }
    c.clearRect(0, 0, W, H);
    if (!liste.length) return;
    for (let i = liste.length - 1; i >= 0; i--) {
      const p = liste[i];
      p.t += dt;
      if (p.t >= p.vie) { liste.splice(i, 1); continue; }
      const k = p.t / p.vie;
      if (p.k === "conv") {
        const e = k * k, r1 = p.d * (1 - e), r2 = r1 + 10 + 46 * e;
        const x1 = ct.x + Math.cos(p.a) * r1, y1 = ct.y + Math.sin(p.a) * r1;
        const x2 = ct.x + Math.cos(p.a) * r2, y2 = ct.y + Math.sin(p.a) * r2;
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = Math.min(1, k / 0.2) * 0.9;
        c.strokeStyle = p.col; c.lineWidth = p.s; c.lineCap = "round";
        c.beginPath(); c.moveTo(x2, y2); c.lineTo(x1, y1); c.stroke();
      } else if (p.k === "eclat") {
        p.vy += 1150 * dt; p.vx *= 1 - 0.7 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        c.globalCompositeOperation = "source-over";
        c.globalAlpha = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
        c.fillStyle = p.col;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.beginPath(); c.moveTo(0, -p.s); c.lineTo(p.s * 0.8, p.s * 0.7); c.lineTo(-p.s * 0.7, p.s * 0.5); c.closePath(); c.fill();
        c.restore();
      } else {
        p.x += (p.vx + Math.sin(p.t * 2 + p.ph) * 6) * dt; p.y += p.vy * dt;
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.sin(p.t * 6 + p.ph));
        c.fillStyle = p.col;
        etoile(p.x, p.y, p.s);
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  };
  raf = requestAnimationFrame(boucle);

  return {
    taux(k, v) { taux[k] = Math.max(0, v); },
    eclats(couleurs, n) {
      const ct = centre();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 260 + Math.random() * 720;
        liste.push({
          k: "eclat", x: ct.x + (Math.random() - 0.5) * ct.h * 0.35, y: ct.y + (Math.random() - 0.5) * ct.h * 0.5,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, t: 0, vie: 1 + Math.random() * 0.7,
          s: 3 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: au(couleurs),
        });
      }
    },
    arreter() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      liste = [];
      c?.clearRect(0, 0, W, H);
    },
  };
}
