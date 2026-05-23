"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, useAnimations } from "@react-three/drei";
import * as THREE from "three";

/* ─── Configuration par animation : props + comportement ──────────────── */
type PropType = "dumbbells" | "barbell" | "kettlebell" | null;
type AnimConfig = {
  path: string;
  prop: PropType;
  isStatic?: boolean;        // désactive la rotation vitrine pour exos statiques
  stripRootMotion?: boolean; // verrouille la position du Hips bone (perso reste centré)
};

const FBX_PATTERNS: [RegExp, AnimConfig][] = [
  // Back Squat (avec barre) — barbell sur épaules
  [/back.?squat|squat.+barre/i,
    { path: "/animations/Back_Squat.fbx", prop: "barbell" }],
  // Air Squat / Squat sans matériel
  [/air.?squat|squat sans|squat\s*body|squat (poids du corps|libre)/i,
    { path: "/animations/Air_Squat.fbx", prop: null }],
  // Snatch — barbell
  [/snatch|arrach[ée]/i,
    { path: "/animations/Snatch.fbx", prop: "barbell" }],
  // Kettlebell Swing
  [/kettlebell\s*swing|kettle\s*bell/i,
    { path: "/animations/Kettlebell_Swing.fbx", prop: "kettlebell" }],
  // Front Raises — dumbbells
  [/front\s*raise|[eé]l[eé]vation.+frontal/i,
    { path: "/animations/Front_Raises.fbx", prop: "dumbbells" }],
  // Bicep Curl — dumbbells
  [/bicep.?curl|curl\s*biceps?|^curl/i,
    { path: "/animations/Bicep_Curl.fbx", prop: "dumbbells" }],

  // Bodyweight cardio / floor
  [/burpee/i,
    { path: "/animations/Burpee.fbx", prop: null, stripRootMotion: true }],
  [/jumping.?jack/i,
    { path: "/animations/Jumping_Jacks.fbx", prop: null }],
  [/bicycle\s*crunch|crunch\s*v[eé]lo/i,
    { path: "/animations/Bicycle_Crunch.fbx", prop: null }],
  [/^crunch|crunch$/i,
    { path: "/animations/Bicycle_Crunch.fbx", prop: null }],
  [/^pompes?$|push.?up/i,
    { path: "/animations/Push_Up.fbx", prop: null }],

  // Statiques : on désactive la rotation caméra pour mieux voir
  [/^plank$|planche\s*(frontale|haute)?|^gainage$/i,
    { path: "/animations/Plank.fbx", prop: null, isStatic: true }],

  [/^sit.?ups?$|^situps?$|abdominaux|relev[eé] du buste/i,
    { path: "/animations/Situps.fbx", prop: null }],

  // Jog — strip root motion (perso reste centré)
  [/^jog|course en place|jog en place|footing/i,
    { path: "/animations/Jog_In_Circle.fbx", prop: null, stripRootMotion: true }],

  // Squat générique → Air Squat
  [/^squats?$|squat$/i,
    { path: "/animations/Air_Squat.fbx", prop: null }],
];

function resolveAnim(exerciseName: string): AnimConfig | null {
  for (const [pattern, cfg] of FBX_PATTERNS) {
    if (pattern.test(exerciseName)) return cfg;
  }
  return null;
}

/* ─── Création d'accessoires 3D ───────────────────────────────────────── */
function makeDumbbell(): THREE.Group {
  const g = new THREE.Group();
  const matMetal = new THREE.MeshStandardMaterial({ color: "#3D4451", metalness: 0.7, roughness: 0.3 });
  const bar  = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 12), matMetal);
  bar.rotation.z = Math.PI / 2;
  const wL   = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), matMetal);
  const wR   = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), matMetal);
  wL.position.x = -7; wR.position.x = 7;
  g.add(bar, wL, wR);
  return g;
}

function makeBarbell(): THREE.Group {
  const g = new THREE.Group();
  const matMetal = new THREE.MeshStandardMaterial({ color: "#3D4451", metalness: 0.7, roughness: 0.3 });
  const matPlate = new THREE.MeshStandardMaterial({ color: "#1F2937", metalness: 0.4, roughness: 0.5 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 180, 12), matMetal);
  bar.rotation.z = Math.PI / 2;
  const plateL = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 5, 24), matPlate);
  const plateR = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 5, 24), matPlate);
  plateL.rotation.z = Math.PI / 2;  plateR.rotation.z = Math.PI / 2;
  plateL.position.x = -75; plateR.position.x = 75;
  g.add(bar, plateL, plateR);
  return g;
}

function makeKettlebell(): THREE.Group {
  const g = new THREE.Group();
  const matMetal = new THREE.MeshStandardMaterial({ color: "#2D3748", metalness: 0.6, roughness: 0.4 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 16), matMetal);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(5, 0.8, 12, 24, Math.PI), matMetal);
  handle.position.y = 7;  handle.rotation.x = Math.PI / 2;
  g.add(ball, handle);
  return g;
}

/* ─── Scène 3D avec props + lock position ─────────────────────────────── */
function AnimatedModel({
  config, accent,
}: {
  config: AnimConfig;
  accent: string;
}) {
  const group = useFBX(config.path);
  const pivotRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(group.animations, group);
  const hipsRef = useRef<THREE.Object3D | null>(null);
  const initialHipsPos = useRef<THREE.Vector3 | null>(null);

  // Cherche le bone "Hips" (ou "mixamorigHips") pour pouvoir verrouiller sa position
  useEffect(() => {
    group.traverse((child) => {
      const name = child.name?.toLowerCase() ?? "";
      if (name === "hips" || name === "mixamorighips" || name.endsWith(":hips")) {
        hipsRef.current = child;
        initialHipsPos.current = child.position.clone();
      }
    });
  }, [group]);

  // Teinte du personnage
  useEffect(() => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            (mat as THREE.MeshStandardMaterial).color?.set(
              accent === "#A78BFA" ? "#C4B0FF" : "#E8D87F"
            );
          }
        });
      }
    });
  }, [group, accent]);

  // Joue l'animation
  useEffect(() => {
    const name = Object.keys(actions)[0];
    if (name) actions[name]?.reset().fadeIn(0.3).play();
    return () => { Object.values(actions).forEach((a) => a?.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attache les props aux mains (LeftHand / RightHand)
  useEffect(() => {
    if (!config.prop) return;
    let leftHand: THREE.Object3D | null = null;
    let rightHand: THREE.Object3D | null = null;
    group.traverse((child) => {
      const name = child.name?.toLowerCase() ?? "";
      if (name === "lefthand" || name === "mixamoriglefthand" || name.endsWith(":lefthand")) leftHand = child;
      if (name === "righthand" || name === "mixamorigrighthand" || name.endsWith(":righthand")) rightHand = child;
    });

    if (config.prop === "dumbbells") {
      const dL = makeDumbbell(); const dR = makeDumbbell();
      if (leftHand) (leftHand as THREE.Object3D).add(dL);
      if (rightHand) (rightHand as THREE.Object3D).add(dR);
    } else if (config.prop === "barbell") {
      // Barre tenue entre les deux mains — on l'attache à la main droite, elle s'étend des deux côtés
      if (rightHand) {
        const bar = makeBarbell();
        (rightHand as THREE.Object3D).add(bar);
      }
    } else if (config.prop === "kettlebell") {
      if (rightHand) {
        const kb = makeKettlebell();
        (rightHand as THREE.Object3D).add(kb);
      }
    }
  }, [group, config.prop]);

  // Per-frame : lock root motion + rotation vitrine
  useFrame((_, delta) => {
    // Strip root motion : maintient la position du Hips à sa valeur initiale
    if (config.stripRootMotion && hipsRef.current && initialHipsPos.current) {
      hipsRef.current.position.x = initialHipsPos.current.x;
      hipsRef.current.position.z = initialHipsPos.current.z;
    }
    // Rotation vitrine (sauf pour les statiques type planche)
    if (pivotRef.current && !config.isStatic) {
      pivotRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={pivotRef} rotation={config.isStatic ? [0, -0.4, 0] : [0, 0, 0]}>
      <primitive object={group} scale={0.011} position={[0, -1.2, 0]} />
    </group>
  );
}

/* ─── Composant public ────────────────────────────────────────────────── */
export default function AnimatedAvatar({
  exerciseName,
  accent = "#A78BFA",
  size = 130,
}: {
  exerciseName: string;
  accent?: string;
  size?: number;
}) {
  const config = resolveAnim(exerciseName);
  const height = Math.round(size * 1.4);

  if (!config) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden flex-shrink-0 flex flex-col items-center justify-center gap-2"
        style={{
          width: size,
          height,
          background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}25`,
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-light"
          style={{
            background: `linear-gradient(135deg, ${accent}40 0%, ${accent}20 100%)`,
            color: "#2D3748",
          }}
        >
          ✦
        </div>
        <p className="text-[9px] font-semibold tracking-widest uppercase text-center px-2"
           style={{ color: `${accent}99` }}>
          Animation
        </p>
        <p className="text-[8px] font-light text-center px-2" style={{ color: "#A0AEC0" }}>
          bientôt
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 60% at 50% 48%, ${accent}22 0%, transparent 70%)`,
        }}
      />
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{
                borderColor: `${accent}33`,
                borderTopColor: accent,
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 1.0, 2.8], fov: 50 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={1.6} />
          <directionalLight position={[5, 10, 5]} intensity={2.0} />
          <directionalLight position={[-3, 4, -4]} intensity={0.7} color={accent} />
          <AnimatedModel config={config} accent={accent} />
        </Canvas>
      </Suspense>
    </div>
  );
}
