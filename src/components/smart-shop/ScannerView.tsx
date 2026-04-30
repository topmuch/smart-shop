'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  XCircle,
  ScanBarcode,
  Loader2,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarcodeScanner } from './BarcodeScanner';
import { ScanResultDialog } from './ScanResultDialog';
import { CartPanel } from './CartPanel';
import { OfflineIndicator } from './OfflineIndicator';
import { useSession } from '@/hooks/use-session';
import { useScanner } from '@/hooks/use-scanner';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { eurosToCents, centsToEuros } from '@/lib/currency';
import type { ScanProductInput, ScannedItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { soundManager } from '@/lib/sound-manager';

interface ScannerViewProps {
  userId: string;
  budgetDefault?: number; // in cents
}

const QUICK_BUDGETS = [
  { label: '25 €', value: 2500 },
  { label: '50 €', value: 5000 },
  { label: '75 €', value: 7500 },
  { label: '100 €', value: 10000 },
];

export function ScannerView({ userId, budgetDefault = 5000 }: ScannerViewProps) {
  const {
    activeSession,
    loading: sessionLoading,
    createSession,
    fetchActiveSession,
    finishSession,
    abandonSession,
    refreshSession,
  } = useSession(userId);

  const { lastScan, isScanning, scanProduct } = useScanner();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  const [scannerActive, setScannerActive] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [localAddedItems, setLocalAddedItems] = useState<ScannedItem[]>([]);
  const [flashVisible, setFlashVisible] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null);

  // ── Budget customization ──
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [customBudget, setCustomBudget] = useState(centsToEuros(budgetDefault)); // in euros for display

  // Sync budgetDefault prop to local state when it changes
  useEffect(() => {
    setCustomBudget(centsToEuros(budgetDefault));
  }, [budgetDefault]);

  // Items = session items + locally added (optimistic) items not yet in session
  const items = useMemo(() => {
    const sessionItems = activeSession?.scannedItems ?? [];
    const sessionIds = new Set(sessionItems.map((i) => i.id));
    const onlyLocal = localAddedItems.filter((i) => !sessionIds.has(i.id));
    return [...sessionItems, ...onlyLocal];
  }, [activeSession?.scannedItems, localAddedItems]);

  // Check for existing active session on mount
  useEffect(() => {
    if (userId) {
      fetchActiveSession(userId);
    }
  }, [userId, fetchActiveSession]);

  // Refresh session after scan to get updated items
  useEffect(() => {
    if (lastScan && activeSession) {
      refreshSession(activeSession.id);
    }
  }, [lastScan, activeSession, refreshSession]);

  // ── Reconcile offline items when they sync ──
  useEffect(() => {
    const handler = (e: Event) => {
      const { tempId } = (e as CustomEvent).detail as {
        tempId: string;
        serverItem: ScannedItem;
      };

      setLocalAddedItems((prev) =>
        prev.filter((item) => item.id !== tempId)
      );

      if (activeSession) {
        refreshSession(activeSession.id);
      }
    };

    window.addEventListener("smartshop:scan-synced", handler);
    return () => window.removeEventListener("smartshop:scan-synced", handler);
  }, [activeSession, refreshSession]);

  // ── Flash feedback on successful scan ──
  const triggerScanFlash = useCallback(() => {
    setFlashVisible(true);
    const timer = setTimeout(() => setFlashVisible(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // ── Start session (with custom budget) ──
  const handleStartSession = async () => {
    soundManager.init(); // Unlock audio on user gesture
    const budgetInCents = eurosToCents(customBudget);
    const session = await createSession({ budgetLimit: budgetInCents });
    if (session) {
      setScannerActive(true);
      setLocalAddedItems([]);
      setBudgetDialogOpen(false);
      toast.success('Session démarrée ! Scannez vos articles.');
    }
  };

  // ── Resume session ──
  const handleResumeSession = () => {
    soundManager.init(); // Unlock audio on user gesture
    setScannerActive(true);
  };

  // ── Scan detected ──
  const handleScanDetected = useCallback((barcode: string) => {
    setCurrentBarcode(barcode);
    setLastBarcode(barcode);
    setScanDialogOpen(true);
  }, []);

  // ── Confirm scan product ──
  const handleConfirmProduct = async (input: ScanProductInput) => {
    if (!activeSession) return;

    const scannedItem = await scanProduct({
      ...input,
      sessionId: activeSession.id,
    });

    if (scannedItem) {
      setLocalAddedItems((prev) => [...prev, scannedItem]);
      setLastAddedProduct(input.productName);
      triggerScanFlash();
      toast.success(`${input.productName} ajouté : ${(input.price / 100).toFixed(2).replace('.', ',')} €`);

      setTimeout(() => setLastAddedProduct(null), 3000);
    }

    // Sync with shopping list: mark matching items as checked
    try {
      const listsRes = await fetch(`/api/lists?userId=${userId}`);
      if (listsRes.ok) {
        const { lists } = await listsRes.json();
        const normalizedBarcode = input.barcode.trim();

        for (const list of lists) {
          const listItems = list.items ?? [];
          const hasMatch = listItems.some(
            (item: { barcode?: string; name: string }) =>
              item.barcode === normalizedBarcode ||
              item.name.toLowerCase() === input.productName.toLowerCase()
          );
          if (hasMatch) {
            const updatedItems = listItems.map((item: Record<string, unknown>) => {
              if (
                (item.barcode as string) === normalizedBarcode ||
                (item.name as string).toLowerCase() === input.productName.toLowerCase()
              ) {
                return { ...item, checked: true };
              }
              return item;
            });
            await fetch(`/api/lists/${list.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: updatedItems }),
            });
          }
        }
      }
    } catch {
      // Silent fail for list sync
    }
  };

  // ── Finish session ──
  const handleFinishSession = async () => {
    if (!activeSession) return;
    soundManager.playSuccess();
    await finishSession(activeSession.id);
    setScannerActive(false);
    setLocalAddedItems([]);
    setLastBarcode(null);
    toast.success('Courses terminées ! Consultez le Dashboard pour le récapitulatif.');
  };

  // ── Abandon session ──
  const handleAbandonSession = async () => {
    if (!activeSession) return;
    await abandonSession(activeSession.id);
    setScannerActive(false);
    setLocalAddedItems([]);
    setLastBarcode(null);
  };

  // ── Remove item ──
  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/scan/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setLocalAddedItems((prev) => prev.filter((i) => i.id !== itemId));
        if (activeSession) refreshSession(activeSession.id);
      }
    } catch {
      // Silently fail
    }
  };

  // ── Render states ──

  // No active session — show start/resume with pulsing CTA
  if (!activeSession && !sessionLoading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center p-8 gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                <ScanBarcode className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              {/* Pulse ring animation */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500"
                animate={{
                  scale: [1, 1.3, 1.5],
                  opacity: [0.6, 0.2, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400 dark:border-green-500"
                animate={{
                  scale: [1, 1.4, 1.6],
                  opacity: [0.4, 0.15, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.7,
                }}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">Prêt à scanner ?</h2>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Commencez une nouvelle session de courses pour scanner vos articles
                et suivre votre budget en temps réel.
              </p>
            </div>
          </div>

          {/* Pulsing CTA button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white text-base px-8 py-6 shadow-lg shadow-green-500/25"
              onClick={() => setBudgetDialogOpen(true)}
              aria-label="Démarrer une nouvelle session de courses"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Play className="h-5 w-5" aria-hidden="true" />
              </motion.div>
              Nouvelle session
            </Button>
          </motion.div>

          <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />
        </div>

        {/* Budget customization dialog */}
        <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" aria-hidden="true" />
                Définir votre budget
              </DialogTitle>
              <DialogDescription>
                Choisissez le budget pour cette session de courses. Vous pourrez le modifier dans les réglages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Budget input */}
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Montant (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="budget-amount"
                    type="number"
                    min={1}
                    step={5}
                    value={customBudget}
                    onChange={(e) => setCustomBudget(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-32"
                    aria-label="Montant du budget en euros"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStartSession();
                    }}
                  />
                  <span className="text-sm text-muted-foreground font-medium">€</span>
                </div>
              </div>

              {/* Quick-select buttons */}
              <div className="space-y-2">
                <Label>Sélection rapide</Label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_BUDGETS.map((qb) => (
                    <Button
                      key={qb.value}
                      variant={eurosToCents(customBudget) === qb.value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'text-sm',
                        eurosToCents(customBudget) === qb.value && 'bg-green-600 hover:bg-green-700 text-white'
                      )}
                      onClick={() => setCustomBudget(centsToEuros(qb.value))}
                      aria-label={`Budget ${qb.label}`}
                    >
                      {qb.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Budget preview */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Budget sélectionné : </span>
                <span className="font-semibold">{customBudget.toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBudgetDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleStartSession}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Commencer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Loading
  if (sessionLoading && !activeSession) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm text-muted-foreground">Chargement de la session...</p>
      </div>
    );
  }

  // Active session — show scanner + cart
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 relative">
      {/* Scan flash overlay */}
      <AnimatePresence>
        {flashVisible && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 pointer-events-none rounded-lg bg-green-500"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      <div className="lg:hidden">
        <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />
      </div>

      {/* Scanner section */}
      <div className={cn(
        'flex flex-col gap-4',
        scannerActive ? 'lg:w-1/2' : 'lg:w-full'
      )}>
        {/* Session controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Session de courses</h2>

            {/* Last added product toast */}
            <AnimatePresence>
              {lastAddedProduct && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1"
                >
                  <ShoppingCart className="h-3 w-3" aria-hidden="true" />
                  {lastAddedProduct}
                </motion.span>
              )}
            </AnimatePresence>

            {!scannerActive && activeSession && (
              <Button
                size="sm"
                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleResumeSession}
                aria-label="Reprendre le scan"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Reprendre le scan
              </Button>
            )}
          </div>

          {activeSession && (
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" aria-label="Abandonner la session">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Abandonner</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Abandonner la session ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Votre progression actuelle ne sera pas sauvegardée. Cette action est irréversible.
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
          )}
        </div>

        {/* Barcode scanner */}
        {scannerActive && (
          <div className="space-y-2">
            <BarcodeScanner
              onScanDetected={handleScanDetected}
              isActive={scannerActive}
            />
            {isScanning && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyse en cours...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart section */}
      {scannerActive && activeSession && (
        <div className="lg:w-1/2">
          <CartPanel
            items={items}
            budgetLimit={activeSession.budgetLimit}
            onFinishSession={handleFinishSession}
            onRemoveItem={handleRemoveItem}
          />
        </div>
      )}

      {/* Scan result dialog */}
      <ScanResultDialog
        barcode={currentBarcode}
        isOpen={scanDialogOpen}
        onClose={() => setScanDialogOpen(false)}
        onConfirm={handleConfirmProduct}
        sessionId={activeSession?.id}
      />
    </div>
  );
}
