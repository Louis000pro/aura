"use client";

/* Sortie de `ConversationListPane` le 2026-08-30 : « Avec qui ? » est la
   seule porte du relais, et elle ne pouvait s'ouvrir que depuis la liste
   des conversations. La galerie du profil ouvre maintenant la MÊME
   feuille, pas une deuxième écrite ailleurs. */

import { useState, useEffect, useMemo } from "react";
import { Loader2, X, Link2, Check } from "lucide-react";
import Sheet from "@/components/communaute/Sheet";
import { PersonAvatar } from "@/components/communaute/ConversationAvatar";
import { PseudoRang } from "@/components/rang/IdentiteRang";
import { VisageGuide } from "@/components/AssistantMark";
import { useGuideActif } from "@/context/GuideContext";
import { voix } from "@/lib/guides";
import { useRangs } from "@/lib/rangsPublics";
import { mesRelations, type Personne } from "@/lib/messagerie";
import { creerDefi, inviterRelais } from "@/lib/defi";
import { refusRelais, type RefusRelais } from "@/lib/defiErreurs";

/* ─── « Avec qui ? » ─────────────────────────────────────────────
   La seule porte du relais, et elle mène aux deux chemins.

   ⚠️ AUCUNE CONVERSATION N'EST CRÉÉE PAR LE CHEMIN DU LIEN. Le fil
   naît quand quelqu'un rejoint (`rejoindre_defi`), sinon on
   fabriquait une discussion à un seul membre, que `titreConversation`
   nommait littéralement « Moi ».

   Des amis choisis (1 à 4, donc 5 avec toi) reçoivent une INVITATION,
   dans leur cloche. Rien n'est créé chez eux tant qu'ils n'ont pas dit
   oui (Louis, 2026-10-09) : le relais démarre quand tout le monde a
   répondu, avec ceux qui ont accepté, et le fil (duo ou groupe) naît à
   ce moment-là. L'attente vit sur /defi, qui montre qui a accepté.
   Le lien : même écran d'attente, avec le lien en grand. */
/** Jusqu'à 4 amis : 5 avec toi, la taille maximale d'un groupe. */
const MAX_AMIS = 4;

export default function AvecQui({ moi, onFermer, onFil, onLien }: {
  moi: string;
  onFermer: () => void;
  onFil: (conversationId: string) => void;
  onLien: () => void;
}) {
  const { guide } = useGuideActif();
  const [gens, setGens]     = useState<Personne[]>([]);
  const [charge, setCharge] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [refus, setRefus]   = useState<RefusRelais | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);
  const rangs = useRangs(useMemo(() => gens.map((g) => g.id), [gens]));

  useEffect(() => {
    void mesRelations(moi)
      .then(setGens)
      .catch(() => setRefus({ texte: "Impossible de charger tes contacts." }))
      .finally(() => setCharge(false));
  }, [moi]);

  const basculer = (id: string) => {
    setRefus(null);
    setChoisis((c) => c.includes(id) ? c.filter((x) => x !== id)
      : c.length >= MAX_AMIS ? c : [...c, id]);
  };

  const lancer = async () => {
    if (!choisis.length) return;
    setOccupe("lancer");
    setRefus(null);
    const r = await inviterRelais(choisis);
    setOccupe(null);
    if (r.ok) { onLien(); return; }
    setRefus(refusRelais(r));
  };

  const parLien = async () => {
    setOccupe("lien");
    setRefus(null);
    const r = await creerDefi();
    setOccupe(null);
    if (r.ok) { onLien(); return; }
    setRefus(refusRelais(r));
  };

  return (
    <Sheet onFermer={onFermer}>
      <div className="mb-1 flex items-center justify-between">
        <b className="text-[20px] font-bold" style={{ color: "var(--text-0)" }}>Avec qui ?</b>
        <button onClick={onFermer} aria-label="Fermer"><X className="h-5 w-5" style={{ color: "var(--text-3)" }} /></button>
      </div>
      {/* Le seuil : c'est ici que les règles se disent, et nulle part
          ailleurs. Le visage remplace la ligne anonyme d'avant, qui
          énonçait déjà une règle sans que personne ne la porte. */}
      <div className="mb-3 flex items-start gap-2.5">
        <VisageGuide guide={guide} etat="explain" size={34} className="mt-0.5" />
        <p className="text-[13px] leading-snug" style={{ color: "var(--text-2)" }}>
          {voix(guide, "relais.avecqui")}
        </p>
      </div>

      <div className="max-h-[38vh] overflow-y-auto">
        {charge ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-3)" }} />
          </div>
        ) : gens.length === 0 ? (
          <p className="py-4 text-center text-[16px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Tu n&apos;as encore personne dans tes contacts.<br />
            Le lien ci-dessous te trouvera quelqu&apos;un.
          </p>
        ) : (
          gens.map((p) => {
            const rang = rangs.get(p.id);
            const pris = choisis.includes(p.id);
            const plein = !pris && choisis.length >= MAX_AMIS;
            return (
              <button
                key={p.id}
                onClick={() => basculer(p.id)}
                disabled={occupe !== null || plein}
                aria-pressed={pris}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left disabled:opacity-50"
              >
                <PersonAvatar personne={p} taille={38} rang={rang} />
                {rang ? (
                  <PseudoRang
                    rang={rang.rang}
                    cosmetiques={rang.cosmetiques}
                    pseudo={p.pseudo}
                    classNameEnveloppe="flex min-w-0 flex-1 items-center gap-1.5"
                    className="truncate text-[16px] font-medium"
                    style={{ color: "var(--text-1)" }}
                    tailleGemme={14}
                  />
                ) : (
                  <span className="flex-1 truncate text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
                    {p.pseudo}
                  </span>
                )}
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2"
                  style={pris
                    ? { background: "#8B5CF6", borderColor: "#8B5CF6" }
                    : { borderColor: "rgba(var(--text-3-rgb), .35)" }}
                >
                  {pris && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>

      {choisis.length > 0 && (
        <>
        <button
          onClick={() => void lancer()}
          disabled={occupe !== null}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #C13BC1)", boxShadow: "var(--ombre-action)" }}
        >
          {occupe === "lancer" && <Loader2 className="h-4 w-4 animate-spin" />}
          {choisis.length === 1 && gens.find((g) => g.id === choisis[0])
            ? `Inviter ${gens.find((g) => g.id === choisis[0])!.pseudo}`
            : `Inviter ${choisis.length} amis`}
        </button>
        <p className="mt-1.5 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
          Le relais démarre quand {choisis.length === 1 ? "ton ami a" : "tout le monde a"} répondu.
        </p>
        </>
      )}

      <button
        onClick={() => void parLien()}
        disabled={occupe !== null}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left disabled:opacity-50"
        style={{ borderColor: "rgba(var(--text-3-rgb), .3)" }}
      >
        <span
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(var(--accent-rgb), .12)" }}
        >
          {occupe === "lien"
            ? <Loader2 className="h-4.5 w-4.5 animate-spin" style={{ color: "var(--exp-encre)" }} />
            : <Link2 className="h-4.5 w-4.5" style={{ color: "var(--exp-encre)" }} />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[16px] font-medium" style={{ color: "var(--text-1)" }}>
            Quelqu&apos;un qui n&apos;a pas Vaiiya
          </b>
          <small className="block text-[13px]" style={{ color: "var(--text-3)" }}>
            Tu obtiendras un lien à envoyer.
          </small>
        </span>
      </button>

      {refus && (
        <div className="mt-3 text-center">
          <p className="text-[13px] leading-snug" style={{ color: "#E8620C" }}>{refus.texte}</p>
          {refus.ou && (
            <button
              onClick={() => onFil(refus.ou!)}
              className="mt-2 text-[13px] font-semibold underline"
              style={{ color: "var(--exp-encre)" }}
            >
              Ouvrir ce relais
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
