"use client";

import Image from "next/image";
import { imageEtat } from "@/lib/defi";
import type { Conversation, Personne } from "@/lib/messagerie";

const PERIMETRE_SCEAU = 156;

export default function ConversationAvatar({
  conversation,
  autres,
  titre,
  taille = 46,
  afficherDefi = true,
}: {
  conversation: Conversation;
  autres: Personne[];
  titre: string;
  taille?: number;
  afficherDefi?: boolean;
}) {
  if (afficherDefi && conversation.defi) {
    return <Sceau defi={conversation.defi} taille={taille} />;
  }

  if (conversation.image) {
    return (
      <Image
        src={conversation.image}
        alt=""
        width={taille}
        height={taille}
        className="shrink-0 rounded-full object-cover"
        style={{ width: taille, height: taille }}
        unoptimized
      />
    );
  }

  if (conversation.type === "groupe" && autres.length >= 2) {
    return <AvatarsGroupe personnes={autres} taille={taille} titre={titre} />;
  }

  return (
    <PersonAvatar
      personne={conversation.type === "duo" ? autres[0] : undefined}
      taille={taille}
      nom={conversation.type === "groupe" ? titre : undefined}
    />
  );
}

function AvatarsGroupe({
  personnes,
  taille,
  titre,
}: {
  personnes: Personne[];
  taille: number;
  titre: string;
}) {
  const visibles = personnes.slice(0, 3);
  const tailleAvatar = Math.max(18, Math.round(taille * 0.61));
  const contour = Math.max(1.5, taille * 0.043);
  const positions = [
    { left: 0, top: 0 },
    { right: 0, top: 0 },
    { left: "50%", bottom: 0, transform: "translateX(-50%)" },
  ];

  return (
    <div
      className="relative shrink-0 rounded-full"
      aria-label={`Groupe ${titre}`}
      style={{ width: taille, height: taille, background: "rgb(var(--surface-rgb))" }}
    >
      {visibles.map((personne, index) => (
        <span
          key={personne.id}
          className="absolute rounded-full"
          style={{
            ...positions[index],
            boxShadow: `0 0 0 ${contour}px rgb(var(--bg-rgb))`,
            lineHeight: 0,
          }}
        >
          <PersonAvatar personne={personne} taille={tailleAvatar} />
        </span>
      ))}
    </div>
  );
}

function Sceau({
  defi,
  taille,
}: {
  defi: NonNullable<Conversation["defi"]>;
  taille: number;
}) {
  const etat = defi.faits <= 0 ? 1
    : defi.faits >= defi.objectif ? 4
    : Math.min(3, 1 + Math.round((3 * defi.faits) / defi.objectif));
  const part = Math.min(1, defi.faits / Math.max(1, defi.objectif));
  const boucle = defi.faits >= defi.objectif;
  const dessine = PERIMETRE_SCEAU * part;

  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <div
        className="absolute overflow-hidden shadow-md"
        style={{
          left: taille * 5 / 46,
          top: taille * 2 / 46,
          width: taille * 36 / 46,
          height: taille * 42 / 46,
          borderRadius: taille * 6 / 46,
        }}
      >
        <Image
          src={imageEtat(defi.serie, etat)}
          alt=""
          fill
          sizes={`${taille}px`}
          className="object-cover"
        />
      </div>

      <svg viewBox="0 0 46 46" fill="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x="3.5" y="0.5" width="39" height="45" rx="7"
          stroke="rgba(215,166,42,.22)" strokeWidth="1.6" />
        {part > 0 && (
          <rect x="3.5" y="0.5" width="39" height="45" rx="7"
            stroke="#D7A62A" strokeWidth={boucle ? 1.9 : 1.6} strokeLinecap="round"
            strokeDasharray={`${dessine} ${PERIMETRE_SCEAU}`} strokeDashoffset={-20} />
        )}
      </svg>

      {boucle && (
        <span
          className="absolute"
          style={{
            right: taille * -3 / 46,
            top: taille * -3 / 46,
            fontSize: Math.max(8, taille * 11 / 46),
            color: "#D7A62A",
            textShadow: "0 0 7px rgba(215,166,42,.8)",
          }}
        >
          ✦
        </span>
      )}
    </div>
  );
}

export function PersonAvatar({
  personne,
  taille,
  nom,
}: {
  personne?: Personne;
  taille: number;
  nom?: string;
}) {
  const dimensions = { width: taille, height: taille };
  if (!nom && personne?.avatar) {
    return (
      <Image
        src={personne.avatar}
        alt=""
        width={taille}
        height={taille}
        className="shrink-0 rounded-full object-cover"
        style={dimensions}
        unoptimized
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        ...dimensions,
        fontSize: taille * 0.36,
        background: "linear-gradient(135deg, #8B5CF6, #C13BC1)",
      }}
    >
      {(nom ?? personne?.pseudo ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}
