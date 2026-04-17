'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import {
  User,
  Mail,
  CreditCard,
  Crown,
  Moon,
  Sun,
  Trash2,
  Info,
  Check,
  X,
  Shield,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  userId: string;
  userName?: string | null;
  userEmail?: string;
  userPlan?: 'free' | 'premium' | 'family';
  budgetDefault?: number;
  onUpdateBudget?: (budget: number) => void;
  onUpgradePlan?: () => void;
  onClearData?: () => void;
}

const planLabels: Record<string, string> = {
  free: 'Gratuit',
  premium: 'Premium',
  family: 'Famille',
};

const planBadgeVariant: Record<string, 'secondary' | 'default' | 'outline'> = {
  free: 'secondary',
  premium: 'default',
  family: 'outline',
};

const featureComparison = [
  {
    feature: 'Listes de courses',
    free: '3 max',
    premium: 'Illimité',
    family: 'Illimité',
  },
  {
    feature: 'Scans par session',
    free: '20',
    premium: 'Illimité',
    family: 'Illimité',
  },
  {
    feature: 'Export CSV',
    free: true,
    premium: true,
    family: true,
  },
  {
    feature: 'Export PDF',
    free: false,
    premium: true,
    family: true,
  },
  {
    feature: 'Historique',
    free: '30 jours',
    premium: 'Illimité',
    family: 'Illimité',
  },
  {
    feature: 'Partage familial',
    free: false,
    premium: false,
    family: true,
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-green-500 mx-auto" aria-label="Disponible" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40 mx-auto" aria-label="Non disponible" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

export function SettingsPanel({
  userName,
  userEmail,
  userPlan = 'free',
  budgetDefault = 50,
  onUpdateBudget,
  onUpgradePlan,
  onClearData,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [budget, setBudget] = useState(budgetDefault);
  const [editingBudget, setEditingBudget] = useState(false);

  const handleSaveBudget = () => {
    onUpdateBudget?.(budget);
    setEditingBudget(false);
  };

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-sm text-muted-foreground">Gérez votre profil et vos préférences.</p>
      </div>

      {/* User profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400">
              <User className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{userName ?? 'Utilisateur'}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{userEmail ?? '—'}</span>
              </div>
            </div>
            <Badge variant={planBadgeVariant[userPlan] ?? 'secondary'} className="gap-1">
              {userPlan === 'premium' || userPlan === 'family' ? (
                <Crown className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {planLabels[userPlan] ?? 'Gratuit'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Default budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Budget par défaut
          </CardTitle>
          <CardDescription>
            Définissez le budget par défaut pour vos nouvelles sessions de courses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editingBudget ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="budget-input" className="sr-only">Budget</Label>
              <Input
                id="budget-input"
                type="number"
                min={1}
                step={5}
                value={budget}
                onChange={(e) => setBudget(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-36"
                aria-label="Montant du budget par défaut"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBudget();
                  if (e.key === 'Escape') setEditingBudget(false);
                }}
              />
              <span className="text-sm text-muted-foreground">€</span>
              <Button size="sm" onClick={handleSaveBudget}>Enregistrer</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{budget.toFixed(2)} €</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingBudget(true)}
                aria-label="Modifier le budget par défaut"
              >
                Modifier
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Abonnement
          </CardTitle>
          <CardDescription>
            Actuellement : {planLabels[userPlan] ?? 'Gratuit'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userPlan !== 'premium' && userPlan !== 'family' && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Débloquez Smart Shop Premium
                </p>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Profitez de listes illimitées, de l&apos;export PDF, d&apos;un historique complet et bien plus encore.
              </p>
              {onUpgradePlan && (
                <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white" onClick={onUpgradePlan}>
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  Passer à Premium
                </Button>
              )}
            </div>
          )}

          {/* Feature comparison table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonctionnalité</TableHead>
                <TableHead className="text-center">Gratuit</TableHead>
                <TableHead className="text-center">Premium</TableHead>
                <TableHead className="text-center">Famille</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureComparison.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="text-sm">{row.feature}</TableCell>
                  <TableCell className="text-center">
                    <CellValue value={row.free} />
                  </TableCell>
                  <TableCell className="text-center">
                    <CellValue value={row.premium} />
                  </TableCell>
                  <TableCell className="text-center">
                    <CellValue value={row.family} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-medium">Mode sombre</p>
                <p className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'Activé' : theme === 'system' ? 'Selon le système' : 'Désactivé'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              aria-label="Basculer le mode sombre"
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            Ces actions sont irréversibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" aria-label="Supprimer toutes les données">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Supprimer toutes mes données
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer toutes les données ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera définitivement toutes vos listes, sessions, et données d&apos;analyse.
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearData}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Supprimer tout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" aria-hidden="true" />
            <span>Smart Shop v1.0.0 — Application de gestion de courses intelligente</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
