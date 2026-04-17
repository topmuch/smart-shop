'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  Loader2,
  ScanBarcode,
  Trash2,
  ChevronRight,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';
import { BudgetBar } from './BudgetBar';
import { EmptyState } from './EmptyState';
import { CATEGORY_COLORS, CATEGORIES } from '@/types';
import { formatCurrency, parseMoney } from '@/lib/safe-helpers';
import { cn } from '@/lib/utils';
import type { ScannedItem } from '@/types';

interface CartViewProps {
  userId: string;
}

/** Group items by category for organized display */
interface CategoryGroup {
  category: string;
  items: ScannedItem[];
  total: number;
  color: string;
}

export function CartView({ userId }: CartViewProps) {
  const {
    activeSession,
    loading,
    error,
    fetchActiveSession,
    finishSession,
    abandonSession,
    refreshSession,
  } = useSession(userId);

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Fetch active session on mount
  useEffect(() => {
    if (userId) {
      fetchActiveSession(userId);
    }
  }, [userId, fetchActiveSession]);

  const items = useMemo(() => {
    return activeSession?.scannedItems ?? [];
  }, [activeSession?.scannedItems]);

  // Group items by category
  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, ScannedItem[]>();

    for (const item of items) {
      const cat = item.category || 'Autre';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }

    // Sort categories by CATEGORIES order, then by total descending
    const result: CategoryGroup[] = [];
    for (const [category, catItems] of groups) {
      const total = catItems.reduce((sum, item) => sum + parseMoney(item.price) * parseMoney(item.quantity), 0);
      result.push({
        category,
        items: catItems,
        total,
        color: CATEGORY_COLORS[category] ?? '#a3a3a3',
      });
    }

    result.sort((a, b) => {
      const orderA = CATEGORIES.indexOf(a.category as typeof CATEGORIES[number]);
      const orderB = CATEGORIES.indexOf(b.category as typeof CATEGORIES[number]);
      if (orderA !== -1 && orderB !== -1) return orderA - orderB;
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;
      return b.total - a.total;
    });

    return result;
  }, [items]);

  const totalSpent = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + parseMoney(item.price) * parseMoney(item.quantity),
        0
      ),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + parseMoney(item.quantity), 0),
    [items]
  );

  const budgetLimit = parseMoney(activeSession?.budgetLimit);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // ── Finish session ──
  const handleFinishSession = async () => {
    if (!activeSession) return;
    await finishSession(activeSession.id);
  };

  // ── Abandon session ──
  const handleAbandonSession = async () => {
    if (!activeSession) return;
    await abandonSession(activeSession.id);
  };

  // ── Remove item ──
  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/scan/${itemId}`, { method: 'DELETE' });
      if (res.ok && activeSession) {
        refreshSession(activeSession.id);
      }
    } catch {
      // Silently fail
    }
  };

  // ── Error state ──
  if (error) {
    return (
      <div className="p-4">
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading && !activeSession) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm text-muted-foreground">
          Chargement du panier...
        </p>
      </div>
    );
  }

  // ── No active session ──
  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <EmptyState
          icon={ShoppingCart}
          title="Aucune session en cours"
          description="Allez dans l'onglet Scanner pour commencer une nouvelle session de courses."
        />
      </div>
    );
  }

  // ── Active session with items ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Mon Panier
          </h2>
          <p className="text-sm text-muted-foreground">
            Session de courses en cours — {categoryGroups.length} catégorie{categoryGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs">
            En cours
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalItems} article{totalItems !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Budget bar card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Suivi du budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetBar spent={totalSpent} limit={budgetLimit} />
        </CardContent>
      </Card>

      {/* Cart items grouped by category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Articles scannés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <EmptyState
                icon={ScanBarcode}
                title="Panier vide"
                description="Aucun article scanné pour le moment. Utilisez le Scanner pour ajouter des produits."
              />
            </div>
          ) : (
            <ScrollArea className="max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {categoryGroups.map((group) => {
                    const isCollapsed = collapsedCategories.has(group.category);
                    return (
                      <motion.div
                        key={group.category}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-lg border"
                      >
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(group.category)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                          aria-expanded={!isCollapsed}
                          aria-label={`${group.category} — ${group.items.length} article${group.items.length !== 1 ? 's' : ''}, ${formatCurrency(group.total)}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                              aria-hidden="true"
                            />
                            <span className="text-sm font-semibold">{group.category}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {group.items.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{formatCurrency(group.total)}</span>
                            <motion.div
                              animate={{ rotate: isCollapsed ? 0 : 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </button>

                        {/* Category items */}
                        <AnimatePresence mode="wait">
                          {!isCollapsed && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t">
                                {group.items.map((item) => {
                                  const subtotal = parseMoney(item.price) * parseMoney(item.quantity);
                                  return (
                                    <motion.div
                                      key={item.id}
                                      layout
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 20 }}
                                      transition={{ duration: 0.15 }}
                                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                                    >
                                      {/* Product info */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {item.productName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[11px] text-muted-foreground font-mono">
                                            {item.barcode}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Qty & price */}
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold">
                                          {formatCurrency(subtotal)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatCurrency(item.price)} × {parseMoney(item.quantity)}
                                        </p>
                                      </div>

                                      {/* Delete */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={() => handleRemoveItem(item.id)}
                                        aria-label={`Supprimer "${item.productName}" du panier`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Category summary strip */}
      {categoryGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryGroups.map((group) => (
            <Badge
              key={group.category}
              variant="outline"
              className="text-xs gap-1.5"
              style={{ borderColor: group.color, color: group.color }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: group.color }}
                aria-hidden="true"
              />
              {group.category}
              <span className="font-semibold">{formatCurrency(group.total)}</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Total + Actions */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Total row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Total ({totalItems} article{totalItems !== 1 ? 's' : ''})
            </span>
            <span className="text-xl font-bold">{formatCurrency(totalSpent)}</span>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Finish session */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className={cn(
                    'flex-1 gap-2',
                    items.length > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : ''
                  )}
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
                    Vous avez dépensé {formatCurrency(totalSpent)} pour{' '}
                    {totalItems} article{totalItems !== 1 ? 's' : ''}. Cette
                    action clôturera votre session de courses.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuer les courses</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinishSession}>
                    Confirmer et terminer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Abandon session */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                  aria-label="Abandonner la session"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Abandonner
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Abandonner la session ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Votre progression actuelle ne sera pas sauvegardée. Cette
                    action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuer</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAbandonSession}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Abandonner
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
