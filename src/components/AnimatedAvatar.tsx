"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, useAnimations } from "@react-three/drei";
import * as THREE from "three";

/* ─── Configuration par animation ─────────────────────────────────────── */
type AnimConfig = {
  path: string;
  isStatic?: boolean;        // désactive la rotation vitrine pour exos statiques
  stripRootMotion?: boolean; // verrouille la position du Hips bone (perso reste centré)
};

const FBX_PATTERNS: [RegExp, AnimConfig][] = [
  // ─── Spécifiques d'abord ────────────────────────────────────
  [/back.?squat|squat.+barre|squat barre/i,                     { path: "/animations/Back_Squat.fbx" }],
  [/overhead\s*squat|squat overhead/i,                          { path: "/animations/Overhead_Squat.fbx" }],
  [/air.?squat (bent|arms)|squat bent arms/i,                  { path: "/animations/Air_Squat.fbx" }],

  // Cardio dynamique
  [/jump.?push.?up|pompes? explosives?/i,                      { path: "/animations/Jump_Push_Up.fbx", stripRootMotion: true }],
  [/burpee/i,                                                   { path: "/animations/Burpee.fbx", stripRootMotion: true }],
  [/jumping.?jack/i,                                            { path: "/animations/Jumping_Jacks.fbx" }],
  [/box.?jump|jump.*box|jump\s*squats?|saut\s*box/i,           { path: "/animations/Box_Jump.fbx", stripRootMotion: true }],
  [/cross.?jumps?.?rotation/i,                                  { path: "/animations/Cross_Jumps_Rotation.fbx", stripRootMotion: true }],
  [/cross.?jumps?/i,                                            { path: "/animations/Cross_Jumps.fbx", stripRootMotion: true }],
  [/high.?knees?|mont[ée]es? de genoux/i,                      { path: "/animations/High_Knees.fbx", stripRootMotion: true }],
  [/sprint( sur place| en place)?|sprint$/i,                   { path: "/animations/Sprint.fbx", stripRootMotion: true }],
  [/^jog|course en place|jog en place|footing|course continue|course z?one?|cardio z?one?/i,
                                                                { path: "/animations/Jog_In_Circle.fbx", stripRootMotion: true }],
  [/pike.?walk/i,                                               { path: "/animations/Pike_Walk.fbx", stripRootMotion: true }],

  // Force / haltérophilie
  [/snatch|arrach[ée]/i,                                        { path: "/animations/Snatch.fbx" }],
  [/clean.?(and|et)?.?jerk|[eé]paul[ée][ -]?jet[ée]/i,         { path: "/animations/Clean_And_Jerk.fbx" }],
  [/sumo.?high.?pull|sumo|tirage menton/i,                      { path: "/animations/Sumo_High_Pull.fbx" }],
  [/kettlebell\s*swing|kettle\s*bell/i,                         { path: "/animations/Kettlebell_Swing.fbx" }],
  [/front\s*raise|[eé]l[eé]vation.+frontal/i,                  { path: "/animations/Front_Raises.fbx" }],
  [/bicep.?curl|curl\s*biceps?|curl\s*(barre|marteau)|^curl/i, { path: "/animations/Bicep_Curl.fbx" }],

  // Bodyweight
  [/^pompes?$|push.?up/i,                                       { path: "/animations/Push_Up.fbx" }],
  [/^plank$|planche\s*(frontale|haute)?|^gainage$/i,           { path: "/animations/Plank.fbx", isStatic: true }],

  // Abdos
  [/circle\s*crunch|crunch.+cercle/i,                          { path: "/animations/Circle_Crunch.fbx" }],
  [/bicycle\s*crunch|crunch\s*v[eé]lo/i,                       { path: "/animations/Bicycle_Crunch.fbx" }],
  [/^crunch|crunch$/i,                                          { path: "/animations/Bicycle_Crunch.fbx" }],
  [/^sit.?ups?$|^situps?$|abdominaux|relev[eé] du buste/i,     { path: "/animations/Situps.fbx" }],

  // Squat générique (en dernier pour ne pas écraser Back/Air/Overhead)
  [/air.?squat|squat sans|squat\s*body|squat (poids du corps|libre)/i, { path: "/animations/Air_Squat.fbx" }],
  [/^squats?$|squat$/i,                                         { path: "/animations/Air_Squat.fbx" }],
];

function resolveAnim(exerciseName: string): AnimConfig | null {
  for (const [pattern, cfg] of FBX_PATTERNS) {
    if (pattern.test(exerciseName)) return cfg;
  }
  return null;
}

/* ─── Scène 3D avec lock root motion ──────────────────────────────────── */
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
