'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertOctagon } from 'lucide-react';

interface BudgetBarProps {
  spent: number;
  limit: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function BudgetBar({ spent, limit }: BudgetBarProps) {
  const percentage = useMemo(() => {
    if (limit <= 0) return 0;
    return Math.min((spent / limit) * 100, 100);
  }, [spent, limit]);

  const remaining = limit - spent;

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
          <span className="text-base font-bold">{formatCurrency(spent)}</span>
          <span className="text-muted-foreground"> / {formatCurrency(limit)}</span>
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
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Warning / Critical badges */}
      <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
        {percentage >= 80 && percentage < 100 && (
          <Badge variant={badgeVariant} className="gap-1 text-xs border-amber-500 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Attention : 80 % du budget
          </Badge>
        )}
        {percentage >= 100 && (
          <Badge variant={badgeVariant} className="gap-1 text-xs">
            <AlertOctagon className="h-3 w-3" aria-hidden="true" />
            Budget dépassé !
          </Badge>
        )}
      </div>
    </div>
  );
}
