'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { lookupProduct } from '@/lib/product-database';
import { CATEGORIES, CATEGORY_COLORS } from '@/types';
import type { ScanProductInput } from '@/types';
import { SearchCheck, Package } from 'lucide-react';

interface ScanResultDialogProps {
  barcode: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: ScanProductInput) => void;
  sessionId?: string;
}

/** Inner form content — remounts when barcode changes via key prop */
function ScanResultForm({
  barcode,
  onClose,
  onConfirm,
  sessionId,
}: {
  barcode: string;
  onClose: () => void;
  onConfirm: (item: ScanProductInput) => void;
  sessionId: string;
}) {
  const product = lookupProduct(barcode);
  const [productName, setProductName] = useState(product?.name ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [category, setCategory] = useState<string>(product?.category ?? CATEGORIES[0]);
  const [quantity, setQuantity] = useState(1);

  const handleConfirm = () => {
    if (!productName.trim() || !price) return;
    onConfirm({
      sessionId,
      barcode,
      productName: productName.trim(),
      price: parseFloat(price) || 0,
      category,
      quantity,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SearchCheck className="h-5 w-5 text-green-500" aria-hidden="true" />
          Produit détecté
        </DialogTitle>
        <DialogDescription>
          Vérifiez et confirmez les informations du produit.
        </DialogDescription>
      </DialogHeader>

      {/* Product found indicator */}
      {product && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
          <Package className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Produit identifié dans la base de données
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Barcode (read-only) */}
        <div className="space-y-1.5">
          <Label htmlFor="scan-barcode">Code-barres</Label>
          <Input
            id="scan-barcode"
            value={barcode}
            readOnly
            className="font-mono text-sm bg-muted"
            aria-label="Code-barres scanné"
          />
        </div>

        {/* Product name */}
        <div className="space-y-1.5">
          <Label htmlFor="scan-name">Nom du produit</Label>
          <Input
            id="scan-name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Nom du produit"
            autoFocus
          />
        </div>

        {/* Price & Quantity row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="scan-price">Prix (€)</Label>
            <Input
              id="scan-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scan-quantity">Quantité</Label>
            <Input
              id="scan-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>Catégorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full" aria-label="Catégorie du produit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#a3a3a3' }}
                      aria-hidden="true"
                    />
                    {cat}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category badge preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Catégorie :</span>
          <Badge
            variant="outline"
            style={{ borderColor: CATEGORY_COLORS[category] ?? undefined, color: CATEGORY_COLORS[category] ?? undefined }}
          >
            {category}
          </Badge>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onClose}
        >
          Annuler
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          onClick={handleConfirm}
          disabled={!productName.trim() || !price || parseFloat(price) < 0}
        >
          Ajouter au panier
        </button>
      </DialogFooter>
    </>
  );
}

export function ScanResultDialog({
  barcode,
  isOpen,
  onClose,
  onConfirm,
  sessionId = '',
}: ScanResultDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* key forces remount when barcode changes, avoiding effect-based state sync */}
        {isOpen && barcode && (
          <ScanResultForm
            key={barcode}
            barcode={barcode}
            onClose={onClose}
            onConfirm={onConfirm}
            sessionId={sessionId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
