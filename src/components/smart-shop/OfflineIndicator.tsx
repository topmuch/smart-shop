'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing?: boolean;
}

export function OfflineIndicator({ isOnline, pendingCount, isSyncing = false }: OfflineIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-label={
        isSyncing
          ? 'Synchronisation en cours'
          : isOnline
            ? 'Connecté'
            : `Hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`
      }
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" aria-hidden="true" />
        ) : isOnline ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
        )}
        {/* Pulse dot */}
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-background',
            isSyncing && 'bg-amber-500 animate-pulse',
            !isSyncing && isOnline && 'bg-green-500',
            !isSyncing && !isOnline && 'bg-destructive animate-pulse'
          )}
          aria-hidden="true"
        />
      </div>

      {pendingCount > 0 && (
        <Badge variant={isOnline ? 'secondary' : 'destructive'} className="text-xs gap-1">
          {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
        </Badge>
      )}
    </div>
  );
}
