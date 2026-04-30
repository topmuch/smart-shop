'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Trash2,
  CheckCircle,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BudgetBar } from './BudgetBar';
import { EmptyState } from './EmptyState';
import { CATEGORY_COLORS } from '@/types';
import type { ScannedItem } from '@/types';
import { formatCurrency } from '@/lib/safe-helpers';

interface CartPanelProps {
  items: ScannedItem[];
  budgetLimit: number;
  onFinishSession: () => void;
  onRemoveItem?: (itemId: string) => void;
}

export function CartPanel({
  items,
  budgetLimit,
  onFinishSession,
  onRemoveItem,
}: CartPanelProps) {
  // All prices in cents
  const totalSpent = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Panier de courses">
      {/* Budget bar */}
      <div className="p-4 pb-2">
        <BudgetBar spent={totalSpent} limit={budgetLimit} />
      </div>

      <Separator />

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            icon={ShoppingBag}
            title="Panier vide"
            description="Scannez un code-barres pour ajouter des produits à votre panier."
          />
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4 pt-2">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const subtotal = item.price * item.quantity;
                const catColor = CATEGORY_COLORS[item.category] ?? '#a3a3a3';
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.isOffline && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 shrink-0"
                            title="En attente de synchronisation"
                          >
                            <WifiOff className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                          style={{ borderColor: catColor, color: catColor }}
                        >
                          {item.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.barcode}
                        </span>
                      </div>
                    </div>

                    {/* Qty & price */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(subtotal)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>

                    {/* Delete */}
                    {onRemoveItem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Supprimer "${item.productName}" du panier`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      <Separator />

      {/* Footer: Total + finish */}
      <div className="p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalItems} article{totalItems !== 1 ? 's' : ''}
          </span>
          <span className="text-lg font-bold">{formatCurrency(totalSpent)}</span>
        </div>

        {/* Finish button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full gap-2"
              disabled={items.length === 0}
              aria-label="Terminer les courses"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Terminer les courses
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Terminer la session ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous avez dépensé {formatCurrency(totalSpent)} pour {totalItems} article
                {totalItems !== 1 ? 's' : ''}. Cette action clôturera votre session de courses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuer les courses</AlertDialogCancel>
              <AlertDialogAction onClick={onFinishSession}>
                Confirmer et terminer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
