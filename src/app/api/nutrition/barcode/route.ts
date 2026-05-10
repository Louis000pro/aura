import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

interface OFFProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_small_url?: string;
  image_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    "energy_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
  quantity?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ error: "code manquant" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_fr,brands,nutriments,serving_size,quantity,image_front_small_url,image_url`,
      { headers: { "User-Agent": "Aura-App/1.0 (contact@aura.app)" } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const json = await res.json();

    if (json.status === 0 || !json.product) {
      return NextResponse.json({ error: "Produit non trouvé dans la base" }, { status: 404 });
    }

    const p: OFFProduct = json.product;
    const n = p.nutriments ?? {};

    const name = p.product_name_fr || p.product_name || "Produit inconnu";
    const brand = p.brands?.split(",")[0]?.trim() ?? null;

    // Energy: prefer kcal directly, fallback kJ→kcal
    const kcalPer100 = n["energy-kcal_100g"] ?? (n["energy_100g"] ? Math.round(n["energy_100g"] / 4.184) : 0);

    return NextResponse.json({
      name,
      brand,
      image: p.image_front_small_url ?? p.image_url ?? null,
      quantity: p.quantity ?? null,
      serving_size: p.serving_size ?? null,
      per100: {
        calories: Math.round(kcalPer100),
        proteins: Math.round((n.proteins_100g ?? 0) * 10) / 10,
        carbs:    Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
        fats:     Math.round((n.fat_100g ?? 0) * 10) / 10,
        fiber:    Math.round((n.fiber_100g ?? 0) * 10) / 10,
      },
    });
  } catch (err) {
    console.error("Barcode lookup error:", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}
