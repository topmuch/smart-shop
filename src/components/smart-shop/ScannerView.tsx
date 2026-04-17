'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  XCircle,
  ScanBarcode,
  Loader2,
  ShoppingCart,
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
import { BarcodeScanner } from './BarcodeScanner';
import { ScanResultDialog } from './ScanResultDialog';
import { CartPanel } from './CartPanel';
import { OfflineIndicator } from './OfflineIndicator';
import { useSession } from '@/hooks/use-session';
import { useScanner } from '@/hooks/use-scanner';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import type { ScanProductInput, ScannedItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { soundManager } from '@/lib/sound-manager';

interface ScannerViewProps {
  userId: string;
}

export function ScannerView({ userId }: ScannerViewProps) {
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

  // ── Flash feedback on successful scan ──
  const triggerScanFlash = useCallback(() => {
    setFlashVisible(true);
    // Auto-hide after 300ms
    const timer = setTimeout(() => setFlashVisible(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // ── Start session ──
  const handleStartSession = async () => {
    soundManager.init(); // Unlock audio on user gesture
    const session = await createSession({ budgetLimit: 50 });
    if (session) {
      setScannerActive(true);
      setLocalAddedItems([]);
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
      toast.success(`${input.productName} ajouté : ${input.price.toFixed(2)} €`);

      // Clear product name display after 3s
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
            onClick={handleStartSession}
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
