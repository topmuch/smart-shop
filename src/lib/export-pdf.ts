import type { ShoppingSession, ScannedItem } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SessionWithItems extends ShoppingSession {
  scannedItems: ScannedItem[];
}

/**
 * Generate a SHA-256 hash from session data.
 * Uses only deterministic fields (no timestamp) so the hash
 * is the same every time the same receipt is regenerated.
 * Uses crypto.subtle for both Node.js and browser compatibility.
 */
async function generateHash(session: SessionWithItems): Promise<string> {
  const total = session.scannedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const data = JSON.stringify({
    sessionId: session.id,
    total,
    itemCount: session.scannedItems.length,
  });

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert cents to euros string with 2 decimal places.
 */
function centsToEuroString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Generate a receipt PDF as a base64 string using jsPDF.
 * All prices in session data are in cents.
 * @param session - The shopping session with items
 * @param hash - Pre-computed SHA-256 hash to embed in the PDF
 */
export function generateReceiptPDF(
  session: SessionWithItems,
  hash: string
): string {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // ── Header ──
  // Smart Shop title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Green
  doc.text("🛒 Smart Shop", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Reçu de courses", pageWidth / 2, y, { align: "center" });
  y += 12;

  // ── Divider ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Session Info ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const sessionDate = new Date(session.startTime).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.text(`Date : ${sessionDate}`, margin, y);
  y += 6;

  if (session.location) {
    doc.text(`Lieu : ${session.location}`, margin, y);
    y += 6;
  }

  doc.text(`Session : ${session.id.slice(0, 12)}...`, margin, y);
  y += 6;

  doc.text(
    `Budget : ${centsToEuroString(session.budgetLimit)} €`,
    margin,
    y
  );
  y += 10;

  // ── Items Table ──
  const tableBody = session.scannedItems.map((item) => [
    item.productName,
    item.category,
    String(item.quantity),
    `${centsToEuroString(item.price)} €`,
    `${centsToEuroString(item.price * item.quantity)} €`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Nom", "Catégorie", "Qté", "Prix", "Sous-total"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 25 },
    },
  });

  // Get the Y position after the table
  const lastAutoTable = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable;
  y = lastAutoTable?.finalY
    ? lastAutoTable.finalY + 10
    : y + 60;

  // ── Totals ──
  const total = session.scannedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemCount = session.scannedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const remaining = session.budgetLimit - total;
  const isOverBudget = remaining < 0;

  // Total line
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - margin - 60, y - 2, pageWidth - margin, y - 2);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Total :", pageWidth - margin - 60, y + 4);
  doc.text(`${centsToEuroString(total)} €`, pageWidth - margin, y + 4, {
    align: "right",
  });
  y += 10;

  // Budget info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  doc.text(`${itemCount} article${itemCount > 1 ? "s" : ""} au total`, margin, y);
  y += 6;

  if (isOverBudget) {
    doc.setTextColor(239, 68, 68); // Red
    doc.text(
      `⚠ Dépassement du budget : +${centsToEuroString(Math.abs(remaining))} €`,
      margin,
      y
    );
  } else {
    doc.setTextColor(34, 197, 94); // Green
    doc.text(
      `✓ Budget respecté — Reste : ${centsToEuroString(remaining)} €`,
      margin,
      y
    );
  }
  y += 12;

  // ── Divider ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── SHA-256 Hash ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Empreinte numérique (SHA-256) :", margin, y);
  y += 4;
  doc.setFontSize(6);
  // Split the hash for readability
  const hashPart1 = hash.slice(0, 32);
  const hashPart2 = hash.slice(32, 64);
  doc.text(hashPart1, margin, y);
  doc.text(hashPart2, margin, y + 3);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(
    "Généré par Smart Shop — Document non contractuel",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Return base64 encoded PDF
  return doc.output("datauristring").split(",")[1] ?? doc.output("datauristring");
}

/**
 * Generate a SHA-256 hash for session receipt data.
 * Exported separately so it can be used in API routes.
 * Now async because crypto.subtle is async.
 * Deterministic: uses sessionId + total + itemCount only (no timestamp).
 */
export async function generateReceiptHash(
  session: SessionWithItems
): Promise<string> {
  return generateHash(session);
}
