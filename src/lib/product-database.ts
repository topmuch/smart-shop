import type { ProductCategory } from "@/types";

interface ProductLookup {
  barcode: string;
  name: string;
  price: number; // prices in cents
  category: ProductCategory;
}

const PRODUCT_DATABASE: ProductLookup[] = [
  // Fruits & Légumes
  {
    barcode: "3017620422003",
    name: "Pommes Golden",
    price: 249,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620425003",
    name: "Bananes",
    price: 169,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620428003",
    name: "Tomates Grappe",
    price: 299,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620431003",
    name: "Carottes",
    price: 129,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620434003",
    name: "Fraises Gariguette",
    price: 399,
    category: "Fruits & Légumes",
  },

  // Boulangerie
  {
    barcode: "3560070043460",
    name: "Baguette Tradition",
    price: 115,
    category: "Boulangerie",
  },
  {
    barcode: "3560070043477",
    name: "Pain de Campagne",
    price: 235,
    category: "Boulangerie",
  },
  {
    barcode: "3257981200104",
    name: "Pains au Chocolat (x4)",
    price: 220,
    category: "Boulangerie",
  },

  // Produits Laitiers
  {
    barcode: "3256540000017",
    name: "Lait Demi-Écrémé 1L",
    price: 95,
    category: "Produits Laitiers",
  },
  {
    barcode: "3257980700030",
    name: "Yaourt Nature (x8)",
    price: 189,
    category: "Produits Laitiers",
  },
  {
    barcode: "3178530403671",
    name: "Beurre Doux 250g",
    price: 239,
    category: "Produits Laitiers",
  },
  {
    barcode: "3256540500012",
    name: "Comté 12 mois 200g",
    price: 329,
    category: "Produits Laitiers",
  },

  // Viandes & Poissons
  {
    barcode: "2297140000008",
    name: "Poulet Fermier (kg)",
    price: 899,
    category: "Viandes & Poissons",
  },
  {
    barcode: "2297140100005",
    name: "Steak Haché (x2)",
    price: 429,
    category: "Viandes & Poissons",
  },
  {
    barcode: "2297140200002",
    name: "Saumon Frais (tranche)",
    price: 649,
    category: "Viandes & Poissons",
  },

  // Épicerie
  {
    barcode: "7613035692749",
    name: "Pâtes Penne 500g",
    price: 89,
    category: "Épicerie",
  },
  {
    barcode: "8076809513753",
    name: "Sauce Tomate Basilic",
    price: 149,
    category: "Épicerie",
  },
  {
    barcode: "3017760000219",
    name: "Riz Basmati 1kg",
    price: 219,
    category: "Épicerie",
  },
  {
    barcode: "5449000000996",
    name: "Huile d'Olive Extra Vierge 750ml",
    price: 599,
    category: "Épicerie",
  },

  // Boissons
  {
    barcode: "3124480147598",
    name: "Eau Minérale (pack 6x1.5L)",
    price: 249,
    category: "Boissons",
  },
  {
    barcode: "3117910001006",
    name: "Jus d'Orange Frais 1L",
    price: 289,
    category: "Boissons",
  },
  {
    barcode: "3251530000025",
    name: "Café Moulu (paquet 250g)",
    price: 339,
    category: "Boissons",
  },

  // Surgelés
  {
    barcode: "3017620442003",
    name: "Pizza Margherita",
    price: 349,
    category: "Surgelés",
  },
  {
    barcode: "3017620445003",
    name: "Frites Surgelées 1kg",
    price: 199,
    category: "Surgelés",
  },

  // Hygiène & Beauté
  {
    barcode: "3014260000018",
    name: "Gel Douche 400ml",
    price: 269,
    category: "Hygiène & Beauté",
  },
  {
    barcode: "3014260100015",
    name: "Dentifrice 75ml",
    price: 189,
    category: "Hygiène & Beauté",
  },

  // Maison & Entretien
  {
    barcode: "3014260200012",
    name: "Lessive Liquide 2L",
    price: 549,
    category: "Maison & Entretien",
  },
  {
    barcode: "3014260300019",
    name: "Éponges (x3)",
    price: 149,
    category: "Maison & Entretien",
  },
  {
    barcode: "3014260400016",
    name: "Nettoyant Multi-Usage 750ml",
    price: 229,
    category: "Maison & Entretien",
  },
];

/**
 * Lookup a product by its barcode.
 * Returns the product info if found, or null otherwise.
 */
export function lookupProduct(barcode: string): ProductLookup | null {
  const normalizedBarcode = barcode.trim();
  return (
    PRODUCT_DATABASE.find((p) => p.barcode === normalizedBarcode) ?? null
  );
}

/**
 * Get all available products (for browsing / testing).
 */
export function getAllProducts(): ProductLookup[] {
  return [...PRODUCT_DATABASE];
}

/**
 * Search products by name (partial match, case-insensitive).
 */
export function searchProducts(query: string): ProductLookup[] {
  const q = query.toLowerCase().trim();
  return PRODUCT_DATABASE.filter((p) =>
    p.name.toLowerCase().includes(q)
  );
}
