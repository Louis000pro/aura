/* ════════════════════════════════════════════════════════════════════
   seasonFinaleExport — le mini-Wrapped de fin de saison en PNG 1080×1920
   (format story), dessiné entièrement au canvas : fond nuit, balafre
   dorée diagonale (la signature visuelle de la saison), les deux camps
   avec leurs scores, ton bilan personnel. Même philosophie que
   perfShareExport : les chiffres sont dessinés au pixel, jamais inventés.
   ════════════════════════════════════════════════════════════════════ */

import { rankFor } from "@/lib/season";
import type { SeasonRecap } from "@/lib/seasonApi";

export type FinaleShareData = {
  recap: SeasonRecap;
  user: string; // « @teyroox »
};

/** Rend le poster de finale sur un canvas 1080×1920 et renvoie le Blob PNG. */
export async function renderFinaleBlob({ recap, user }: FinaleShareData): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const ls = (v: number) => { try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${v}px`; } catch { /* noop */ } };
  ctx.textBaseline = "alphabetic";

  const s = recap.season;
  const winnerName = recap.winner === "draw" ? null : recap.winner === "a" ? s.camp_a_name : s.camp_b_name;
  const iWon = recap.myCamp !== null && recap.myCamp === recap.winner;
  const rank = rankFor(recap.myEclats);

  // 1) Fond nuit (radial haut → noir)
  const bg = ctx.createRadialGradient(W / 2, -H * 0.06, 0, W / 2, -H * 0.06, H * 1.15);
  bg.addColorStop(0, "#100B1E"); bg.addColorStop(0.52, "#050208"); bg.addColorStop(1, "#000");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // 2) La balafre dorée diagonale (signature de la saison)
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate((17 * Math.PI) / 180);
  const slash = ctx.createLinearGradient(0, -H, 0, H);
  slash.addColorStop(0, "rgba(230,197,110,0)");
  slash.addColorStop(0.5, "rgba(230,197,110,0.85)");
  slash.addColorStop(1, "rgba(230,197,110,0)");
  ctx.fillStyle = slash; ctx.fillRect(-3, -H, 6, H * 2);
  const glow = ctx.createLinearGradient(0, -H, 0, H);
  glow.addColorStop(0, "rgba(230,197,110,0)");
  glow.addColorStop(0.5, "rgba(230,197,110,0.16)");
  glow.addColorStop(1, "rgba(230,197,110,0)");
  ctx.fillStyle = glow; ctx.fillRect(-46, -H, 92, H * 2);
  ctx.restore();

  // 3) Marque + nom de saison
  ctx.textAlign = "center";
  ctx.fillStyle = "#E6C56E"; ls(10); ctx.font = `700 42px ${sans}`;
  ctx.fillText("✦ VAIIYA", W / 2, 150);
  ctx.fillStyle = "#BCB7D6"; ls(8); ctx.font = `700 34px ${sans}`;
  ctx.fillText(`${s.name.toUpperCase()} · LA FINALE`, W / 2, 216); ls(0);

  // 4) Les deux camps : emblèmes + scores géants (vainqueur doré, l'autre éteint)
  const drawCamp = (x: number, emblem: string, name: string, pts: number, won: boolean) => {
    ctx.textAlign = "center";
    ctx.globalAlpha = won || recap.winner === "draw" ? 1 : 0.42;
    ctx.font = `400 150px ${sans}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(emblem, x, 560);
    ctx.fillStyle = won ? "#E6C56E" : "#ECEAF6";
    ctx.font = `800 148px ${sans}`;
    ctx.fillText(String(pts), x, 780);
    ls(4); ctx.fillStyle = "#BCB7D6"; ctx.font = `700 36px ${sans}`;
    ctx.fillText(name.toUpperCase(), x, 850); ls(0);
    ctx.globalAlpha = 1;
  };
  drawCamp(W * 0.27, s.camp_a_emblem, s.camp_a_name, recap.points.a, recap.winner === "a");
  drawCamp(W * 0.73, s.camp_b_emblem, s.camp_b_name, recap.points.b, recap.winner === "b");

  // 5) Le verdict
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.font = `800 66px ${sans}`;
  ctx.fillText(
    recap.winner === "draw" ? "Égalité parfaite" : `Les ${winnerName} l'emportent ✦`,
    W / 2, 1010,
  );
  if (recap.myCamp) {
    ctx.fillStyle = iWon ? "#E6C56E" : "#BCB7D6"; ctx.font = `600 40px ${sans}`;
    ctx.fillText(
      recap.winner === "draw" ? "Personne ne plie." : iWon ? "Ton camp. Ta victoire." : "La revanche commence maintenant.",
      W / 2, 1078,
    );
  }

  // 6) Ton bilan : 3 chiffres
  ctx.strokeStyle = "rgba(195,174,255,0.25)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(120, 1190); ctx.lineTo(W - 120, 1190); ctx.stroke();
  const stats: [string, string][] = [
    [String(recap.mySeances), recap.mySeances > 1 ? "SÉANCES" : "SÉANCE"],
    [String(recap.myEclats), "ÉCLATS ✦"],
    [rank.name.toUpperCase(), "RANG FINAL"],
  ];
  stats.forEach(([v, l], i) => {
    const x = W * (0.22 + i * 0.28);
    ctx.fillStyle = i === 2 ? "#E6C56E" : "#fff"; ctx.font = `800 ${i === 2 ? 64 : 88}px ${sans}`;
    ctx.fillText(v, x, 1330);
    ls(4); ctx.fillStyle = "#BCB7D6"; ctx.font = `600 30px ${sans}`;
    ctx.fillText(l, x, 1390); ls(0);
  });

  // 7) Badges de la saison (jusqu'à 4)
  if (recap.seasonBadges.length > 0) {
    const badges = recap.seasonBadges.slice(0, 4);
    const step = 140;
    const x0 = W / 2 - ((badges.length - 1) * step) / 2;
    badges.forEach((b, i) => {
      ctx.font = `400 72px ${sans}`;
      ctx.fillText(b.badge_emoji, x0 + i * step, 1540);
    });
    ls(3); ctx.fillStyle = "#BCB7D6"; ctx.font = `600 28px ${sans}`;
    ctx.fillText(badges.length > 1 ? "EXPLOITS DE LA SAISON" : "EXPLOIT DE LA SAISON", W / 2, 1596); ls(0);
  }

  // 8) Pseudo + pied
  ctx.fillStyle = "rgba(236,234,246,0.85)"; ctx.font = `500 40px ${sans}`;
  ctx.fillText(user, W / 2, 1750);
  ctx.fillStyle = "rgba(188,183,214,0.6)"; ctx.font = `400 30px ${sans}`;
  ctx.fillText("vaiiya.fr", W / 2, 1810);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Partage natif (mobile) si dispo, sinon téléchargement du PNG. */
export async function shareFinaleCard(data: FinaleShareData, filename = "vaiiya-saison.png"): Promise<"shared" | "downloaded" | "error"> {
  const blob = await renderFinaleBlob(data);
  if (!blob) return "error";

  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch { /* annulé → on retombe sur le téléchargement */ }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}
