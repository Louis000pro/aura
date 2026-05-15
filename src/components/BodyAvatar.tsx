"use client";

import { useMemo } from "react";
import Model from "react-body-highlighter";
import type { IExerciseData, Muscle } from "react-body-highlighter";
import type { Gender } from "@/hooks/useProfileSettings";

export type MuscleKey = string;

export const MUSCLE_MAP: Record<string, string[]> = {
  "Pectoraux":    ["chest"],
  "Dos":          ["upper-back", "trapezius"],
  "Épaules":      ["front-deltoids", "back-deltoids"],
  "Biceps":       ["biceps"],
  "Triceps":      ["triceps"],
  "Abdominaux":   ["abs", "obliques"],
  "Lombaires":    ["lower-back"],
  "Quadriceps":   ["quadriceps"],
  "Fessiers":     ["gluteal"],
  "Ischio":       ["hamstring"],
  "Corps entier": [
    "chest", "biceps", "triceps", "front-deltoids", "back-deltoids",
    "abs", "obliques", "trapezius", "upper-back", "lower-back",
    "quadriceps", "hamstring", "gluteal", "calves", "forearm",
  ],
  "Cardio":    ["chest", "abs", "quadriceps", "hamstring", "calves"],
  "Mobilité":  ["front-deltoids", "back-deltoids", "abs", "quadriceps"],
  "Souplesse": ["quadriceps", "hamstring"],
};

export default function BodyAvatar({
  gender   = "homme",
  muscles  = [],
  accent   = "#A78BFA",
  width    = 160,
  className = "",
}: {
  gender?:    Gender;
  muscles?:   string[];
  accent?:    string;
  width?:     number;
  className?: string;
}) {
  void gender;

  const data: IExerciseData[] = useMemo(() => {
    const rbhMuscles = new Set<string>();
    muscles.forEach(m => MUSCLE_MAP[m]?.forEach(k => rbhMuscles.add(k)));
    if (rbhMuscles.size === 0) return [];
    return [{ name: "workout", muscles: Array.from(rbhMuscles) as Muscle[] }];
  }, [muscles]);

  const modelWidth = Math.round(width / 2) - 4;
  const labelStyle: React.CSSProperties = {
    fontSize: 6,
    color: "rgba(138,156,172,0.80)",
    fontWeight: 700,
    letterSpacing: "0.14em",
    fontFamily: "system-ui,sans-serif",
  };

  return (
    <div className={`flex items-end justify-center gap-2 ${className}`}>
      <div className="flex flex-col items-center gap-0.5">
        <Model
          data={data}
          highlightedColors={[accent]}
          bodyColor="rgba(178,196,216,0.55)"
          style={{ width: modelWidth }}
          type="anterior"
        />
        <span style={labelStyle}>AVANT</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <Model
          data={data}
          highlightedColors={[accent]}
          bodyColor="rgba(178,196,216,0.55)"
          style={{ width: modelWidth }}
          type="posterior"
        />
        <span style={labelStyle}>ARRIÈRE</span>
      </div>
    </div>
  );
}
