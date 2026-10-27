import { Loader2 } from "lucide-react";

/* Les infos d'une discussion : route dynamique, et le chargement du fil
   parent (`../loading.tsx`) ne joue pas pour un passage du fil à ses infos,
   parce qu'il est déjà affiché. Sans ce fichier, toucher l'en-tête du fil ne
   montrait rien le temps que le serveur réponde. Le même indicateur que la
   page pendant sa lecture. */
export default function ChargementInfos() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
    </div>
  );
}
