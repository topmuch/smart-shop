'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  ShoppingCart,
  ScanBarcode,
  Wallet,
  Download,
  FileText,
  Crown,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '@/hooks/use-dashboard';
import { CATEGORY_COLORS } from '@/types';
import type { SessionSummary } from '@/types';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  userId: string;
  isPremium?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClass ?? 'bg-muted')}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: SessionSummary['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-600 text-xs">Terminée</Badge>;
    case 'active':
      return <Badge variant="secondary" className="text-xs">En cours</Badge>;
    case 'abandoned':
      return <Badge variant="outline" className="text-xs">Abandonnée</Badge>;
  }
}

export function DashboardView({
  userId,
  isPremium = false,
  onExportCSV,
  onExportPDF,
}: DashboardViewProps) {
  const {
    categorySpending,
    monthlyTrend,
    currentMonthTotal,
    sessionHistory,
    loading,
    error,
    formatCurrency: fmtCurrency,
    completedSessionsCount,
    totalItemsScanned,
  } = useDashboard(userId);

  const avgBudget = useMemo(() => {
    const completed = sessionHistory.filter((s) => s.status === 'completed');
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, s) => sum + s.total, 0);
    return total / completed.length;
  }, [sessionHistory]);

  const chartData = useMemo(
    () =>
      categorySpending.map((c) => ({
        name: c.category,
        total: Math.round(c.total * 100) / 100,
        count: c.count,
        fill: CATEGORY_COLORS[c.category] ?? '#a3a3a3',
      })),
    [categorySpending]
  );

  const trendData = useMemo(
    () =>
      monthlyTrend.map((m) => ({
        name: m.month,
        total: Math.round(m.total * 100) / 100,
        sessions: m.sessions,
      })),
    [monthlyTrend]
  );

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-sm text-muted-foreground">Suivi de vos dépenses et analyses.</p>
        </div>
        <div className="flex items-center gap-2">
          {onExportCSV && (
            <Button size="sm" variant="outline" className="gap-2" onClick={onExportCSV} aria-label="Exporter en CSV">
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV
            </Button>
          )}
          {onExportPDF && (
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={isPremium ? onExportPDF : undefined}
                disabled={!isPremium}
                aria-label="Exporter en PDF"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                PDF
                {!isPremium && (
                  <Crown className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                )}
              </Button>
              {!isPremium && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1 py-0">
                  Premium
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label="Total ce mois"
              value={fmtCurrency(currentMonthTotal)}
              colorClass="bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400"
            />
            <StatCard
              icon={ShoppingCart}
              label="Sessions"
              value={String(completedSessionsCount())}
              subtext={`${sessionHistory.length} au total`}
              colorClass="bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={ScanBarcode}
              label="Articles scannés"
              value={String(totalItemsScanned())}
              colorClass="bg-cyan-100 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Budget moyen"
              value={avgBudget > 0 ? fmtCurrency(avgBudget) : '—'}
              subtext="par session terminée"
              colorClass="bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category spending bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
            <CardDescription>Répartition de vos achats</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} €`, 'Total']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend area chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendance mensuelle</CardTitle>
            <CardDescription>Évolution de vos dépenses sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : trendData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} €`, 'Total']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session history table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique des sessions</CardTitle>
          <CardDescription>Vos dernières courses</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sessionHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Aucune session enregistrée
            </div>
          ) : (
            <ScrollArea className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px]">Lieu</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Articles</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionHistory.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          {new Date(session.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          {session.location ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(session.total)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {session.itemsCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(session.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
