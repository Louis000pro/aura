"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useFBX, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import ExerciseAvatar, { resolveExType } from "./ExerciseAvatar";

/* ─── Mapping type d'exercice → fichier FBX ───────────────────────────── */
const FBX_MAP: Record<string, string> = {
  squat:    "/animations/Back_Squat.fbx",
  pushup:   "/animations/Push_Up.fbx",
  plank:    "/animations/Plank.fbx",
  crunch:   "/animations/Bicycle_Crunch.fbx",
  run:      "/animations/Jog_In_Circle.fbx",
  deadlift: "/animations/Burpee.fbx",
  lunge:    "/animations/Situps.fbx",
  curl:     "/animations/Jumping_Jacks.fbx",
  press:    "/animations/Jumping_Jacks.fbx",
  pullup:   "/animations/Push_Up.fbx",
  row:      "/animations/Situps.fbx",
  default:  "/animations/Jumping_Jacks.fbx",
};

function getFbxPath(exerciseName: string): string {
  const type = resolveExType(exerciseName);
  return FBX_MAP[type] ?? FBX_MAP.default;
}

/* ─── Scène 3D intérieure (doit être dans <Canvas>) ───────────────────── */
function AnimatedModel({ path, accent }: { path: string; accent: string }) {
  const group = useFBX(path);
  const pivotRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(group.animations, group);

  // Teinter le personnage avec la couleur accent
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

  // Lancer la première animation en boucle
  useEffect(() => {
    const name = Object.keys(actions)[0];
    if (name) {
      actions[name]?.reset().fadeIn(0.3).play();
    }
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Légère rotation pour effet "vitrine"
  useFrame((_, delta) => {
    if (pivotRef.current) {
      pivotRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={pivotRef}>
      <primitive object={group} scale={0.011} position={[0, -1.2, 0]} />
    </group>
  );
}

/* ─── Fallback SVG pendant le chargement FBX ──────────────────────────── */
function FbxFallback({
  exerciseName, accent, size,
}: {
  exerciseName: string; accent: string; size: number;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <ExerciseAvatar exerciseName={exerciseName} accent={accent} size={size} />
    </div>
  );
}

/* ─── Composant public ─────────────────────────────────────────────────── */
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
      {/* Halo coloré derrière le modèle */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 60% at 50% 48%, ${accent}22 0%, transparent 70%)`,
        }}
      />

      <Suspense
        fallback={
          <FbxFallback exerciseName={exerciseName} accent={accent} size={size} />
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
