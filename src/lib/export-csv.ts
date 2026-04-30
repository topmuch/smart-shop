import type { ShoppingSession, ScannedItem } from "@/types";

interface SessionWithItems extends ShoppingSession {
  scannedItems: ScannedItem[];
}

/**
 * Escape a CSV field according to RFC 4180.
 */
function escapeCsvField(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format cents to euros string with 2 decimal places and comma as decimal separator (French style).
 */
function formatCentsAsEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Generate a CSV string for a shopping session receipt.
 * All prices in session data are in cents.
 *
 * Columns: Nom, Code-barres, Catégorie, Quantité, Prix unitaire, Sous-total
 */
export function generateCSV(session: SessionWithItems): string {
  const lines: string[] = [];

  // Header with session info
  lines.push("Smart Shop - Reçu de courses");
  lines.push("");
  lines.push(`Date: ${new Date(session.startTime).toLocaleDateString("fr-FR")}`);
  if (session.location) {
    lines.push(`Lieu: ${session.location}`);
  }
  lines.push(`Session: ${session.id}`);
  lines.push("");

  // Separator
  lines.push("─".repeat(80));
  lines.push("");

  // CSV table header
  lines.push(
    "Nom,Code-barres,Catégorie,Quantité,Prix unitaire (€),Sous-total (€)"
  );

  // Items
  session.scannedItems.forEach((item) => {
    const subtotal = item.price * item.quantity;
    const row = [
      escapeCsvField(item.productName),
      escapeCsvField(item.barcode),
      escapeCsvField(item.category),
      String(item.quantity),
      formatCentsAsEuros(item.price),
      formatCentsAsEuros(subtotal),
    ];
    lines.push(row.join(","));
  });

  // Separator
  lines.push("");
  lines.push("─".repeat(80));
  lines.push("");

  // Totals
  const total = session.scannedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemCount = session.scannedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  lines.push(`Total articles: ${itemCount}`);
  lines.push(`Montant total: ${formatCentsAsEuros(total)} €`);
  lines.push(`Budget: ${formatCentsAsEuros(session.budgetLimit)} €`);

  const remaining = session.budgetLimit - total;
  if (remaining >= 0) {
    lines.push(`Reste: ${formatCentsAsEuros(remaining)} €`);
  } else {
    lines.push(`Dépassement: ${formatCentsAsEuros(Math.abs(remaining))} €`);
  }

  lines.push("");
  lines.push("Généré par Smart Shop");

  return lines.join("\n");
}
