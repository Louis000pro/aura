import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

interface OFFNutriments {
  "energy-kcal_100g"?: number;
  "energy_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
}

interface OFFProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_small_url?: string;
  image_url?: string;
  nutriments?: OFFNutriments;
  serving_size?: string;
  quantity?: string;
}

const OFF_FIELDS =
  "product_name,product_name_fr,brands,nutriments,serving_size,quantity,image_front_small_url,image_url";

async function fetchOFF(domain: string, code: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(
      `https://${domain}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
      {
        headers: { "User-Agent": "Aura-App/1.0 (contact@aura.app)" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 0 || !json.product) return null;
    return json.product as OFFProduct;
  } catch {
    return null;
  }
}

function hasRealNutrition(n: OFFNutriments): boolean {
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"]! / 4.184 : 0);
  return kcal > 0 || (n.proteins_100g ?? 0) > 0 || (n.carbohydrates_100g ?? 0) > 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ error: "code manquant" }, { status: 400 });
  }

  try {
    // 1️⃣ Essai sur world.openfoodfacts.org (base mondiale)
    let product = await fetchOFF("world.openfoodfacts.org", code);

    // 2️⃣ Fallback sur fr.openfoodfacts.org (meilleure couverture France)
    if (!product) {
      product = await fetchOFF("fr.openfoodfacts.org", code);
    }

    // 3️⃣ Produit totalement inconnu → on renvoie 404 avec productName null
    if (!product) {
      return NextResponse.json(
        { error: "Produit non trouvé dans la base", productName: null },
        { status: 404 }
      );
    }

    const name  = product.product_name_fr || product.product_name || null;
    const brand = product.brands?.split(",")[0]?.trim() ?? null;
    const n     = product.nutriments ?? {};

    // 4️⃣ Produit trouvé mais SANS données nutritionnelles
    //    → retour "partiel" : le front peut pré-remplir le champ IA
    if (!hasRealNutrition(n)) {
      return NextResponse.json({
        partial: true,
        name:    name  ?? "Produit inconnu",
        brand,
        image:   product.image_front_small_url ?? product.image_url ?? null,
      });
    }

    // 5️⃣ Produit complet ✓
    const kcalPer100 =
      n["energy-kcal_100g"] ??
      (n["energy_100g"] ? Math.round(n["energy_100g"] / 4.184) : 0);

    return NextResponse.json({
      name:         name ?? "Produit inconnu",
      brand,
      image:        product.image_front_small_url ?? product.image_url ?? null,
      quantity:     product.quantity     ?? null,
      serving_size: product.serving_size ?? null,
      per100: {
        calories: Math.round(kcalPer100),
        proteins: Math.round((n.proteins_100g        ?? 0) * 10) / 10,
        carbs:    Math.round((n.carbohydrates_100g   ?? 0) * 10) / 10,
        fats:     Math.round((n.fat_100g             ?? 0) * 10) / 10,
        fiber:    Math.round((n.fiber_100g           ?? 0) * 10) / 10,
      },
    });
  } catch (err) {
    console.error("Barcode lookup error:", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}
