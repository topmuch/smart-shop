import type { ProductCategory } from "@/types";

interface ProductLookup {
  barcode: string;
  name: string;
  price: number;
  category: ProductCategory;
}

const PRODUCT_DATABASE: ProductLookup[] = [
  // Fruits & Légumes
  {
    barcode: "3017620422003",
    name: "Pommes Golden",
    price: 2.49,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620425003",
    name: "Bananes",
    price: 1.69,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620428003",
    name: "Tomates Grappe",
    price: 2.99,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620431003",
    name: "Carottes",
    price: 1.29,
    category: "Fruits & Légumes",
  },
  {
    barcode: "3017620434003",
    name: "Fraises Gariguette",
    price: 3.99,
    category: "Fruits & Légumes",
  },

  // Boulangerie
  {
    barcode: "3560070043460",
    name: "Baguette Tradition",
    price: 1.15,
    category: "Boulangerie",
  },
  {
    barcode: "3560070043477",
    name: "Pain de Campagne",
    price: 2.35,
    category: "Boulangerie",
  },
  {
    barcode: "3257981200104",
    name: "Pains au Chocolat (x4)",
    price: 2.20,
    category: "Boulangerie",
  },

  // Produits Laitiers
  {
    barcode: "3256540000017",
    name: "Lait Demi-Écrémé 1L",
    price: 0.95,
    category: "Produits Laitiers",
  },
  {
    barcode: "3257980700030",
    name: "Yaourt Nature (x8)",
    price: 1.89,
    category: "Produits Laitiers",
  },
  {
    barcode: "3178530403671",
    name: "Beurre Doux 250g",
    price: 2.39,
    category: "Produits Laitiers",
  },
  {
    barcode: "3256540500012",
    name: "Comté 12 mois 200g",
    price: 3.29,
    category: "Produits Laitiers",
  },

  // Viandes & Poissons
  {
    barcode: "2297140000008",
    name: "Poulet Fermier (kg)",
    price: 8.99,
    category: "Viandes & Poissons",
  },
  {
    barcode: "2297140100005",
    name: "Steak Haché (x2)",
    price: 4.29,
    category: "Viandes & Poissons",
  },
  {
    barcode: "2297140200002",
    name: "Saumon Frais (tranche)",
    price: 6.49,
    category: "Viandes & Poissons",
  },

  // Épicerie
  {
    barcode: "7613035692749",
    name: "Pâtes Penne 500g",
    price: 0.89,
    category: "Épicerie",
  },
  {
    barcode: "8076809513753",
    name: "Sauce Tomate Basilic",
    price: 1.49,
    category: "Épicerie",
  },
  {
    barcode: "3017760000219",
    name: "Riz Basmati 1kg",
    price: 2.19,
    category: "Épicerie",
  },
  {
    barcode: "5449000000996",
    name: "Huile d'Olive Extra Vierge 750ml",
    price: 5.99,
    category: "Épicerie",
  },

  // Boissons
  {
    barcode: "3124480147598",
    name: "Eau Minérale (pack 6x1.5L)",
    price: 2.49,
    category: "Boissons",
  },
  {
    barcode: "3117910001006",
    name: "Jus d'Orange Frais 1L",
    price: 2.89,
    category: "Boissons",
  },
  {
    barcode: "3251530000025",
    name: "Café Moulu (paquet 250g)",
    price: 3.39,
    category: "Boissons",
  },

  // Surgelés
  {
    barcode: "3017620442003",
    name: "Pizza Margherita",
    price: 3.49,
    category: "Surgelés",
  },
  {
    barcode: "3017620445003",
    name: "Frites Surgelées 1kg",
    price: 1.99,
    category: "Surgelés",
  },

  // Hygiène & Beauté
  {
    barcode: "3014260000018",
    name: "Gel Douche 400ml",
    price: 2.69,
    category: "Hygiène & Beauté",
  },
  {
    barcode: "3014260100015",
    name: "Dentifrice 75ml",
    price: 1.89,
    category: "Hygiène & Beauté",
  },

  // Maison & Entretien
  {
    barcode: "3014260200012",
    name: "Lessive Liquide 2L",
    price: 5.49,
    category: "Maison & Entretien",
  },
  {
    barcode: "3014260300019",
    name: "Éponges (x3)",
    price: 1.49,
    category: "Maison & Entretien",
  },
  {
    barcode: "3014260400016",
    name: "Nettoyant Multi-Usage 750ml",
    price: 2.29,
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
