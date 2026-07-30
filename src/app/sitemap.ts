import type { MetadataRoute } from "next";

/**
 * Sitemap des pages publiques indexables de Vaiiya.
 * Les pages personnalisées derrière l'auth ne sont volontairement pas listées.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://vaiiya.fr";
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/premium", priority: 0.8, changeFrequency: "monthly" },
    // Pages vitrine SEO (contenu indexable, mots-clés)
    { path: "/coach-ia", priority: 0.9, changeFrequency: "monthly" },
    { path: "/prise-de-masse", priority: 0.9, changeFrequency: "monthly" },
    { path: "/perte-de-poids", priority: 0.9, changeFrequency: "monthly" },
    { path: "/musculation-maison", priority: 0.8, changeFrequency: "monthly" },
    { path: "/nutrition-sportive", priority: 0.8, changeFrequency: "monthly" },
    { path: "/coach", priority: 0.6, changeFrequency: "monthly" },
    { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
    { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
