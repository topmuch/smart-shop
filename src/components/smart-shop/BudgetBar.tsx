'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { formatCurrency } from '@/lib/safe-helpers';

interface BudgetBarProps {
  spent: number;
  limit: number;
}

export function BudgetBar({ spent, limit }: BudgetBarProps) {
  const safeSpent = spent ?? 0;
  const safeLimit = limit ?? 0;
  const percentage = useMemo(() => {
    if (safeLimit <= 0) return 0;
    return (safeSpent / safeLimit) * 100;
  }, [safeSpent, safeLimit]);

  const clampedPercentage = Math.min(percentage, 100);
  const remaining = safeLimit - safeSpent;
  const isWarning = percentage >= 80 && percentage < 100;
  const isCritical = percentage >= 100;

  const colorClass = useMemo(() => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-green-500';
  }, [percentage]);

  const badgeVariant = useMemo(() => {
    if (percentage >= 100) return 'destructive' as const;
    if (percentage >= 80) return 'outline' as const;
    return 'secondary' as const;
  }, [percentage]);

  return (
    <div className="space-y-2 w-full" role="region" aria-label="Suivi du budget">
      {/* Text info */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          <span className="text-base font-bold">{formatCurrency(safeSpent)}</span>
          <span className="text-muted-foreground"> / {formatCurrency(safeLimit)}</span>
        </span>
        <span
          className={cn(
            'text-sm font-medium',
            remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
          )}
        >
          {remaining < 0
            ? `Dépassement : ${formatCurrency(Math.abs(remaining))}`
            : `Reste : ${formatCurrency(remaining)}`}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(percentage)} % du budget utilisé`}
      >
        <motion.div
          className={cn('h-full rounded-full', colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Warning pulse glow overlay */}
        {isWarning && (
          <motion.div
            className="absolute top-0 right-0 h-full rounded-full bg-orange-500"
            animate={{
              width: [`${clampedPercentage}%`, `${clampedPercentage + 2}%`, `${clampedPercentage}%`],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Critical pulse glow overlay */}
        {isCritical && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* Warning / Critical badges */}
      <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
        {isWarning && (
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Badge variant={badgeVariant} className="gap-1 text-xs border-amber-500 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Attention : {Math.round(percentage)} % du budget
            </Badge>
          </motion.div>
        )}
        {isCritical && (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Badge variant={badgeVariant} className="gap-1 text-xs">
              <AlertOctagon className="h-3 w-3" aria-hidden="true" />
              Budget dépassé !
            </Badge>
          </motion.div>
        )}

        {/* Safe state - show percentage */}
        {!isWarning && !isCritical && safeLimit > 0 && (
          <span className="text-xs text-muted-foreground">
            {Math.round(percentage)} % utilisé
          </span>
        )}
      </div>
    </div>
  );
}
