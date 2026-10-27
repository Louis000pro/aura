/* Le profil d'un ami est une route dynamique (un pseudo par adresse) : sans
   ce fichier, toucher un ami laissait l'écran d'avant figé le temps que le
   serveur réponde, sans rien pour dire que l'appui avait été pris. Le même
   rond que la page montre pendant sa lecture : on passe de l'un à l'autre
   sans que rien ne saute. */
export default function ChargementProfil() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(var(--accent-rgb),0.2)", borderTopColor: "var(--accent)" }}
      />
    </div>
  );
}
