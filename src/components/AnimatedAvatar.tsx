"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, useAnimations } from "@react-three/drei";
import * as THREE from "three";
// Pas de fallback stick figure : si pas d'animation 3D, on affiche un placeholder neutre

/* ─── Mapping STRICT nom d'exercice → fichier FBX ─────────────────────── */
/* Ordre important : patterns spécifiques avant patterns génériques        */
const FBX_PATTERNS: [RegExp, string][] = [
  // === Spécifiques en premier (avant les génériques) ===

  // Back Squat (avec barre) — avant "Squat" générique
  [/back.?squat|squat.+barre/i,            "/animations/Back_Squat.fbx"],
  // Air Squat / Squat sans matériel / Squat bodyweight
  [/air.?squat|squat sans|squat\s*body|squat bouteille|squat (poids du corps|libre)/i,
                                            "/animations/Air_Squat.fbx"],

  // Snatch / Arraché (Olympique)
  [/snatch|arrach[ée]/i,                   "/animations/Snatch.fbx"],
  // Kettlebell Swing
  [/kettlebell\s*swing|kettle\s*bell/i,    "/animations/Kettlebell_Swing.fbx"],
  // Front Raises / Élévations frontales
  [/front\s*raise|[eé]l[eé]vation.+frontal/i, "/animations/Front_Raises.fbx"],
  // Bicep Curl / Curl biceps
  [/bicep.?curl|curl\s*biceps?|^curl/i,    "/animations/Bicep_Curl.fbx"],

  // Burpees — avant "jumping/burpee" du regex run
  [/burpee/i,                               "/animations/Burpee.fbx"],
  // Jumping Jacks
  [/jumping.?jack/i,                        "/animations/Jumping_Jacks.fbx"],
  // Bicycle Crunch (spécifique avant "crunch" générique)
  [/bicycle\s*crunch|crunch\s*v[eé]lo/i,   "/animations/Bicycle_Crunch.fbx"],
  // Crunch générique
  [/^crunch|crunch$/i,                      "/animations/Bicycle_Crunch.fbx"],

  // Pompes / Push Up
  [/^pompes?$|push.?up/i,                   "/animations/Push_Up.fbx"],
  // Plank / Planche / Gainage frontal
  [/^plank$|planche\s*(frontale|haute)?|^gainage$/i, "/animations/Plank.fbx"],
  // Sit-ups / Abdominaux classiques (relevé du buste)
  [/^sit.?ups?$|^situps?$|abdominaux|relev[eé] du buste/i, "/animations/Situps.fbx"],

  // Jog / Course en place
  [/^jog|course en place|jog en place|footing/i, "/animations/Jog_In_Circle.fbx"],

  // === Squat générique tout en bas (matche après les autres) ===
  [/^squats?$|squat$/i,                     "/animations/Air_Squat.fbx"],
];

function getFbxPath(exerciseName: string): string | null {
  for (const [pattern, path] of FBX_PATTERNS) {
    if (pattern.test(exerciseName)) return path;
  }
  return null;
}

/* ─── Scène 3D ────────────────────────────────────────────────────────── */
function AnimatedModel({ path, accent }: { path: string; accent: string }) {
  const group = useFBX(path);
  const pivotRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(group.animations, group);

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

  useEffect(() => {
    const name = Object.keys(actions)[0];
    if (name) actions[name]?.reset().fadeIn(0.3).play();
    return () => { Object.values(actions).forEach((a) => a?.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (pivotRef.current) pivotRef.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={pivotRef}>
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
  const fbxPath = getFbxPath(exerciseName);
  const height = Math.round(size * 1.4);

  if (!fbxPath) {
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
          <AnimatedModel path={fbxPath} accent={accent} />
        </Canvas>
      </Suspense>
    </div>
  );
}
