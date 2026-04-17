import type { ShoppingSession, ScannedItem } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import crypto from "crypto";

interface SessionWithItems extends ShoppingSession {
  scannedItems: ScannedItem[];
}

/**
 * Generate a SHA-256 hash from session data.
 */
function generateHash(session: SessionWithItems): string {
  const data = JSON.stringify({
    sessionId: session.id,
    total: session.scannedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ),
    itemCount: session.scannedItems.length,
    timestamp: new Date().toISOString(),
  });

  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a receipt PDF as a base64 string using jsPDF.
 */
export function generateReceiptPDF(session: SessionWithItems): string {
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
    `Budget : ${session.budgetLimit.toFixed(2)} €`,
    margin,
    y
  );
  y += 10;

  // ── Items Table ──
  const tableBody = session.scannedItems.map((item) => [
    item.productName,
    item.category,
    String(item.quantity),
    `${item.price.toFixed(2)} €`,
    `${(item.price * item.quantity).toFixed(2)} €`,
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
  y = (doc as unknown as Record<string, number>).lastAutoTable?.finalY
    ? (doc as unknown as Record<string, number>).lastAutoTable.finalY + 10
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
  doc.text(`${total.toFixed(2)} €`, pageWidth - margin, y + 4, {
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
      `⚠ Dépassement du budget : +${Math.abs(remaining).toFixed(2)} €`,
      margin,
      y
    );
  } else {
    doc.setTextColor(34, 197, 94); // Green
    doc.text(
      `✓ Budget respecté — Reste : ${remaining.toFixed(2)} €`,
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
  const hash = generateHash(session);

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
 */
export function generateReceiptHash(
  session: SessionWithItems
): string {
  return generateHash(session);
}
