/* Une envie en photo : une tuile de « Envie de quoi ? » et de « Toutes les
   envies ». Le mot se pose sur la photo ; dans « Toutes les envies », le
   nombre de recettes s'écrit dessous. */

import ns from "@/components/nutrition/Nutrition.module.css";

export default function TuileEnvie({ label, image, compte, onOuvrir }: {
  label: string;
  image: string;
  compte?: string;
  onOuvrir: () => void;
}) {
  return (
    <button type="button" onClick={onOuvrir} className={ns.tuileEnvie}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" loading="lazy" decoding="async" />
      <span aria-hidden className={ns.voileBas} />
      <span className={ns.motEnvie}>
        <b>{label}</b>
        {compte && <small>{compte}</small>}
      </span>
    </button>
  );
}
