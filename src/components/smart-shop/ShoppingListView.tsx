'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ShoppingCart,
  Trash2,
  Pencil,
  Check,
  ListChecks,
  PackagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from './EmptyState';
import { useShoppingList } from '@/hooks/use-shopping-list';
import { CATEGORIES } from '@/types';
import type { ShoppingList, ShoppingListItem } from '@/types';
import { cn } from '@/lib/utils';

interface ShoppingListViewProps {
  userId: string;
}

export function ShoppingListView({ userId }: ShoppingListViewProps) {
  const {
    lists,
    loading,
    error,
    createList,
    updateList,
    deleteList,
    toggleItem,
    addItem,
    removeItem,
  } = useShoppingList(userId);

  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [editingListName, setEditingListName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // ── Helpers ──

  const getCheckedCount = (list: ShoppingList) =>
    list.items.filter((i) => i.checked).length;

  const getProgress = (list: ShoppingList) =>
    list.items.length > 0
      ? Math.round((getCheckedCount(list) / list.items.length) * 100)
      : 0;

  // ── Create list ──

  const handleCreateList = async () => {
    const newList = await createList({ name: 'Nouvelle liste' });
    if (newList) {
      setSelectedList(newList);
      setDialogOpen(true);
      setEditingName(newList.name);
    }
    setCreatingList(false);
  };

  // ── Open list detail ──

  const openListDetail = (list: ShoppingList) => {
    setSelectedList(list);
    setEditingName(list.name);
    setEditingListName(false);
    setNewItemName('');
    setNewItemCategory(CATEGORIES[0]);
    setNewItemQuantity(1);
    setDialogOpen(true);
  };

  // ── Save list name ──

  const handleSaveName = async () => {
    if (!selectedList || !editingName.trim()) return;
    const updated = await updateList(selectedList.id, { name: editingName.trim() });
    if (updated) setSelectedList(updated);
    setEditingListName(false);
  };

  // ── Add item ──

  const handleAddItem = async () => {
    if (!selectedList || !newItemName.trim()) return;
    const item: ShoppingListItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      category: newItemCategory,
      checked: false,
      quantity: newItemQuantity,
    };
    const updated = await addItem(selectedList.id, item);
    if (updated) setSelectedList(updated);
    setNewItemName('');
    setNewItemQuantity(1);
  };

  // ── Toggle item ──

  const handleToggleItem = async (listId: string, itemId: string) => {
    await toggleItem(listId, itemId);
    // Refresh selectedList from the current lists array
    if (selectedList) {
      const refreshed = lists.find((l) => l.id === selectedList.id);
      if (refreshed) setSelectedList(refreshed);
    }
  };

  // ── Delete item ──

  const handleRemoveItem = async (listId: string, itemId: string) => {
    const updated = await removeItem(listId, itemId);
    if (updated) setSelectedList(updated);
  };

  // ── Delete list ──

  const handleDeleteList = async () => {
    if (!selectedList) return;
    await deleteList(selectedList.id);
    setDialogOpen(false);
    setSelectedList(null);
  };

  // ── Loading state ──

  if (loading && lists.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Mes Listes de Courses</h2>
        <Button
          onClick={handleCreateList}
          disabled={creatingList}
          aria-label="Créer une nouvelle liste de courses"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nouvelle Liste
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {/* Lists grid */}
      {lists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Aucune liste de courses"
          description="Créez votre première liste pour commencer à planifier vos achats."
          action={{ label: 'Nouvelle Liste', onClick: handleCreateList }}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => {
              const progress = getProgress(list);
              const checkedCount = getCheckedCount(list);
              return (
                <motion.div
                  key={list.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openListDetail(list)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openListDetail(list);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ouvrir la liste ${list.name}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{list.name}</CardTitle>
                        {list.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Par défaut
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {checkedCount} / {list.items.length} article{list.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </CardContent>
                    <CardFooter className="pt-0">
                      <span className="text-xs text-muted-foreground">
                        {progress === 100
                          ? 'Liste terminée !'
                          : `${progress} % complété`}
                      </span>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* ── List detail dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            {editingListName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingListName(false);
                  }}
                  className="text-lg font-semibold h-9"
                  aria-label="Nom de la liste"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleSaveName} aria-label="Enregistrer le nom">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg">{selectedList?.name}</DialogTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingListName(true)}
                  aria-label="Modifier le nom de la liste"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <DialogDescription>
              {selectedList &&
                `${getCheckedCount(selectedList)} / ${selectedList.items.length} articles cochés`}
            </DialogDescription>
          </DialogHeader>

          {selectedList && (
            <>
              {/* Progress bar */}
              <div className="space-y-1">
                <Progress value={getProgress(selectedList)} className="h-2" />
              </div>

              {/* Add item form */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <PackagePlus className="h-4 w-4" aria-hidden="true" />
                  Ajouter un article
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Nom de l'article"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddItem();
                    }}
                    className="flex-1"
                    aria-label="Nom du nouvel article"
                  />
                  <Select
                    value={newItemCategory}
                    onValueChange={(v) => setNewItemCategory(v as (typeof CATEGORIES)[number])}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]" aria-label="Catégorie">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full sm:w-20"
                    aria-label="Quantité"
                  />
                  <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim()} aria-label="Ajouter l'article">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Items list */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {selectedList.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun article dans cette liste.
                      </p>
                    ) : (
                      selectedList.items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-2 transition-colors',
                            item.checked && 'bg-muted/50'
                          )}
                        >
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleToggleItem(selectedList.id, item.id)}
                            aria-label={`Marquer "${item.name}" comme ${item.checked ? 'non fait' : 'fait'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                item.checked && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px]">
                                {item.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(selectedList.id, item.id)}
                            aria-label={`Supprimer "${item.name}"`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Footer actions */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteList}
                  aria-label="Supprimer cette liste"
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Supprimer la liste
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
