/**
 * GET /api/exercise-video?q={nom de l'exercice}
 * Renvoie l'ID de la meilleure vidéo YouTube de démonstration (référence humaine).
 * Scrape la recherche YouTube côté serveur (aucune clé API nécessaire) + cache mémoire.
 */
import { NextRequest, NextResponse } from "next/server";
import { garderIA } from "@/lib/aiLimits";

const cache = new Map<string, { id: string | null; t: number }>();
const TTL = 1000 * 60 * 60 * 24; // 24h

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ videoId: null });

  // Le cache mémoire répond en premier : inutile de compter un appel pour une
  // réponse qu'on a déjà sous la main.
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) {
    return NextResponse.json({ videoId: hit.id });
  }

  // Sans garde-fou, cette route va chercher une page YouTube depuis notre
  // serveur à chaque appel : en boucle, c'est notre IP qui se fait bloquer.
  const garde = await garderIA(req, "lookup");
  if (!garde.ok) return garde.reponse;

  try {
    const query = encodeURIComponent(`${q} exercice musculation technique`);
    const url = `https://www.youtube.com/results?search_query=${query}&hl=fr&gl=FR`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      // Pas de cache navigateur côté fetch
      cache: "no-store",
    });
    if (!res.ok) throw new Error("yt " + res.status);
    const html = await res.text();
    const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const id = m ? m[1] : null;
    cache.set(key, { id, t: Date.now() });
    return NextResponse.json({ videoId: id });
  } catch (e) {
    console.error("[exercise-video]", e);
    return NextResponse.json({ videoId: null });
  }
}
