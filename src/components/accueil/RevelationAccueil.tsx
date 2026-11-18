"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SqueletteAccueil from "./SqueletteAccueil";
import styles from "./RevelationAccueil.module.css";

/** Monte l'accueil pendant l'attente puis révèle ensemble ses données et ses images. */
export default function RevelationAccueil({ pret, dejaVu = false, children }: {
  pret: boolean;
  dejaVu?: boolean;
  children: ReactNode;
}) {
  const contenu = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(dejaVu);
  const [attenteLongue, setAttenteLongue] = useState(false);

  useEffect(() => {
    if (visible) return;
    const delai = window.setTimeout(() => setAttenteLongue(true), 12000);
    return () => window.clearTimeout(delai);
  }, [visible]);

  useEffect(() => {
    const element = contenu.current;
    if (visible || !pret || !element) return;
    let annule = false;
    let revision = 0;
    let frame: number | null = null;

    async function verifier() {
      const lecture = ++revision;
      if (!element || element.querySelector('[data-accueil-charge="non"]')) return;
      const images = [...element.querySelectorAll<HTMLImageElement>("img")]
        .filter(image => !image.closest("dialog") && image.getClientRects().length > 0);
      // Les images du premier écran se préparent derrière le squelette.
      for (const image of images) image.loading = "eager";
      await Promise.all([
        document.fonts.ready,
        ...images.map(image => image.decode().catch(() => {})),
      ]);
      if (annule || lecture !== revision) return;
      frame = requestAnimationFrame(() => {
        if (!annule && lecture === revision) setVisible(true);
      });
    }

    const observation = new MutationObserver(() => { void verifier(); });
    observation.observe(element, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["src", "srcset", "data-accueil-charge"] });
    void verifier();
    return () => {
      annule = true;
      observation.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [pret, visible]);

  return <div className={styles.scene} data-visible={visible ? "" : undefined} aria-busy={!visible}>
    {!visible && <div className={styles.attente}>
      <SqueletteAccueil />
      <div className={styles.statut} role="status">
        {attenteLongue ? <>
          <span>Le chargement prend plus de temps que prévu.</span>
          <button type="button" onClick={() => window.location.reload()}>Réessayer</button>
        </> : <span>Ton accueil se prépare…</span>}
      </div>
    </div>}
    <div ref={contenu} className={styles.contenu} inert={!visible} aria-hidden={!visible}>
      {children}
    </div>
  </div>;
}
