"use client";

/* ════════════════════════════════════════════════════════════════════
   LA SILHOUETTE DE LA GÊNE (maquette « Entraînement repensé », lot 2)

   De face et de dos, 39 zones : les muscles en formes, les articulations
   en points. On touche l'endroit qui fait mal ; on peut en choisir
   plusieurs. Les noms des zones sont ceux de `zonesMouvements.ts`.

   Chaque forme se dessine une fois, pour le côté gauche de l'image ;
   l'autre côté est son miroir. De face, le côté gauche de l'image est le
   côté droit de la personne ; de dos, c'est l'inverse. Une épaule ou un
   coude se voit des deux vues : les deux dessins s'allument ensemble.
   ════════════════════════════════════════════════════════════════════ */

type Vue = "face" | "dos";
type Forme = React.ReactNode;

const MIROIR = "translate(120 0) scale(-1 1)";

const ell = (cx: number, cy: number, rx: number, ry: number, rot?: number) =>
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;

const EPAULE = <circle cx={36} cy={49} r={7.4} />;
const PEC = <path d="M42 51C46 47.5 54 47 59 49.5L59 63C54 67.5 46.5 67 42.5 61.5Z" />;
const DORSAL = <path d="M42.5 60C47 62.5 53 64 59 64L59 90C52 89 46.5 85 44.5 78Z" />;
const FLANC = <path d="M42.2 70.5H48.8V97H45.4C44 88.4 42.9 79.6 42.2 70.5Z" />;
const AVANT_BRAS = ell(27.5, 101, 3.9, 10.5, 9);
const MAIN = ell(24, 127, 5, 7);
const PIED = ell(45.5, 231.5, 8.4, 4.8);
const BRAS = ell(33, 67, 4.8, 11.5, 9.5);

export default function Silhouette({ choisies, onBascule }: { choisies: ReadonlySet<string>; onBascule: (zone: string) => void }) {
  const muscle = (nom: string, forme: Forme, cle: string) => (
    <g key={cle} role="button" tabIndex={0} aria-label={nom} aria-pressed={choisies.has(nom)}
      onClick={() => onBascule(nom)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBascule(nom); } }}
      style={{ cursor: "pointer", filter: choisies.has(nom) ? "drop-shadow(0 0 3px rgba(139,92,246,.7))" : undefined }}
      fill={choisies.has(nom) ? "#8B5CF6" : "#D2C6F7"}>
      {forme}
    </g>
  );
  const point = (nom: string, x: number, y: number, cle: string, r = 8) => {
    const actif = choisies.has(nom);
    return (
      <g key={cle} role="button" tabIndex={0} aria-label={nom} aria-pressed={actif}
        onClick={() => onBascule(nom)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBascule(nom); } }}
        style={{ cursor: "pointer", filter: actif ? "drop-shadow(0 0 3px rgba(139,92,246,.7))" : undefined }}>
        <circle cx={x} cy={y} r={r} fill="transparent" />
        <circle cx={x} cy={y} r={3.6} fill={actif ? "#8B5CF6" : "#fff"} stroke={actif ? "#fff" : "#9B83EA"} strokeWidth={1.8} />
      </g>
    );
  };
  const cotes = (vue: Vue, droite: string, gauche: string, forme: Forme, cle: string) => {
    const [ici, la] = vue === "face" ? [droite, gauche] : [gauche, droite];
    return [muscle(ici, forme, cle + "a"), muscle(la, <g transform={MIROIR}>{forme}</g>, cle + "b")];
  };
  const articulation = (vue: Vue, droite: string, gauche: string, x: number, y: number, cle: string, r?: number) => {
    const [ici, la] = vue === "face" ? [droite, gauche] : [gauche, droite];
    return [point(ici, x, y, cle + "a", r), point(la, 120 - x, y, cle + "b", r)];
  };
  const communs = (vue: Vue) => [
    ...cotes(vue, "Avant-bras droit", "Avant-bras gauche", AVANT_BRAS, "av"),
    ...cotes(vue, "Main droite", "Main gauche", MAIN, "ma"),
    ...cotes(vue, "Pied droit", "Pied gauche", PIED, "pi"),
    point("Cou", 60, 32, "co", 7),
    ...articulation(vue, "Coude droit", "Coude gauche", 30, 86, "cd"),
    ...articulation(vue, "Poignet droit", "Poignet gauche", 25.8, 115, "po", 6.5),
    ...articulation(vue, "Cheville droite", "Cheville gauche", 47, 220, "ch", 6.5),
  ];
  const face = [
    ...cotes("face", "Épaule droite", "Épaule gauche", EPAULE, "ep"),
    muscle("Pectoraux", <>{PEC}<g transform={MIROIR}>{PEC}</g></>, "pe"),
    muscle("Côtes", <>{FLANC}<g transform={MIROIR}>{FLANC}</g></>, "cs"),
    muscle("Abdominaux", <rect x={50.5} y={70} width={19} height={35} rx={7} />, "ab"),
    ...cotes("face", "Biceps droit", "Biceps gauche", BRAS, "bi"),
    ...cotes("face", "Cuisse droite", "Cuisse gauche", ell(47.2, 149, 5.6, 18, 2.5), "cu"),
    muscle("Intérieur des cuisses", <>{ell(55.4, 145, 3, 12.5)}<g transform={MIROIR}>{ell(55.4, 145, 3, 12.5)}</g></>, "ad"),
    ...cotes("face", "Tibia droit", "Tibia gauche", ell(47.6, 196, 4.4, 14), "ti"),
    ...articulation("face", "Hanche droite", "Hanche gauche", 46, 127, "ha"),
    ...articulation("face", "Genou droit", "Genou gauche", 48, 172, "ge"),
    ...communs("face"),
  ];
  const dos = [
    muscle("Haut du dos", <path d="M47 39C53 37.5 67 37.5 73 39L80 44 72 57C64 61 56 61 48 57L40 44Z" />, "hd"),
    ...cotes("dos", "Épaule droite", "Épaule gauche", EPAULE, "ep"),
    muscle("Milieu du dos", <>{DORSAL}<g transform={MIROIR}>{DORSAL}</g></>, "md"),
    muscle("Bas du dos", <rect x={50} y={93} width={20} height={16} rx={6} />, "bd"),
    ...cotes("dos", "Triceps droit", "Triceps gauche", BRAS, "tr"),
    muscle("Fessiers", <>{ell(50.5, 121, 9, 8.5)}<g transform={MIROIR}>{ell(50.5, 121, 9, 8.5)}</g></>, "fe"),
    ...cotes("dos", "Arrière de la cuisse droite", "Arrière de la cuisse gauche", ell(49, 153, 7.2, 16, 2.5), "is"),
    ...cotes("dos", "Mollet droit", "Mollet gauche", ell(47.6, 195, 5.2, 14), "mo"),
    ...communs("dos"),
  ];

  return (
    <svg viewBox="0 0 250 258" role="group" aria-label="Silhouette, de face et de dos" className="w-full" style={{ maxHeight: 300 }}>
      <defs>
        <g id="vy-forme-corps" fill="#ECE6FD" stroke="#ECE6FD" strokeWidth={0} strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx={60} cy={238} rx={30} ry={3.2} fill="#6D4BD6" fillOpacity={0.1} />
          <ellipse cx={60} cy={17} rx={10.5} ry={12.5} />
          <rect x={55} y={26} width={10} height={12} rx={3} />
          <path d="M47 37C52 35 68 35 73 37L86 42C89 43.5 89 47 87 50L81 58C80 72 78 86 77 96C77 104 80 112 81 120L81 127C74 132 46 132 39 127L39 120C40 112 43 104 43 96C42 86 40 72 39 58L33 50C31 47 31 43.5 34 42Z" />
          <circle cx={36} cy={49} r={8} /><circle cx={84} cy={49} r={8} />
          <path fill="none" strokeWidth={12} d="M36 50 30 86M84 50 90 86" />
          <path fill="none" strokeWidth={9.5} d="M30 86 25 118M90 86 95 118" />
          <ellipse cx={24} cy={126} rx={4.6} ry={6.6} /><ellipse cx={96} cy={126} rx={4.6} ry={6.6} />
          <path fill="none" strokeWidth={18} d="M50 127 48 172M70 127 72 172" />
          <path fill="none" strokeWidth={12.5} d="M48 172 47 224M72 172 73 224" />
          <ellipse cx={45.5} cy={231.5} rx={8} ry={4.6} /><ellipse cx={74.5} cy={231.5} rx={8} ry={4.6} />
        </g>
      </defs>
      <g transform="translate(3 2)"><use href="#vy-forme-corps" />{face}</g>
      <g transform="translate(127 2)"><use href="#vy-forme-corps" />{dos}</g>
      <text x={63} y={254} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="var(--text-2)">De face</text>
      <text x={187} y={254} textAnchor="middle" fontSize={8.5} fontWeight={600} fill="var(--text-2)">De dos</text>
    </svg>
  );
}
