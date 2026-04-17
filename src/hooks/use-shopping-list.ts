"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ShoppingList,
  ShoppingListItem,
  CreateShoppingListInput,
  UpdateShoppingListInput,
} from "@/types";

/**
 * Hook for managing shopping lists with CRUD operations and optimistic UI updates.
 *
 * @param userId - The ID of the current user. When provided, lists are auto-fetched on mount.
 * @returns An object containing the lists state and methods to manipulate them.
 *
 * @example
 * ```tsx
 * const { lists, currentList, createList, deleteList, toggleItem } = useShoppingList(userId);
 * ```
 */
export function useShoppingList(userId?: string) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all shopping lists for a given user.
   */
  const fetchLists = useCallback(async (uid?: string) => {
    const targetId = uid ?? userId;
    if (!targetId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists?userId=${targetId}`);
      if (!res.ok) throw new Error("Failed to fetch shopping lists");
      const json = await res.json();
      const data = json.lists ?? json;
      setLists(data);
      // Auto-select default list if available
      const defaultList = (data as ShoppingList[]).find((l) => l.isDefault);
      if (defaultList) {
        setCurrentList(defaultList);
      } else if ((data as ShoppingList[]).length > 0) {
        setCurrentList((data as ShoppingList[])[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Create a new shopping list.
   */
  const createList = useCallback(
    async (input: CreateShoppingListInput) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        });
        if (!res.ok) throw new Error("Failed to create shopping list");
        const json = await res.json();
        const newList = (json.list ?? json) as ShoppingList;
        setLists((prev) => [...prev, newList]);
        setCurrentList(newList);
        return newList;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Update an existing shopping list.
   */
  const updateList = useCallback(
    async (id: string, input: UpdateShoppingListInput) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/lists/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error("Failed to update shopping list");
        const json = await res.json();
        const updated = (json.list ?? json) as ShoppingList;
        setLists((prev) =>
          prev.map((l) => (l.id === id ? updated : l))
        );
        setCurrentList((prev) => (prev?.id === id ? updated : prev));
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete a shopping list.
   */
  const deleteList = useCallback(
    async (id: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/lists/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete shopping list");
        setLists((prev) => prev.filter((l) => l.id !== id));
        setCurrentList((prev) => (prev?.id === id ? null : prev));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Optimistically toggle the checked state of a list item.
   * Rolls back on failure.
   */
  const toggleItem = useCallback(
    async (listId: string, itemId: string) => {
      // Capture previous state for rollback
      const previousLists = lists;
      const previousCurrent = currentList;

      // Optimistic update
      const toggleInItems = (items: ShoppingListItem[]) =>
        items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, items: toggleInItems(l.items) } : l
        )
      );
      setCurrentList((prev) =>
        prev?.id === listId
          ? { ...prev, items: toggleInItems(prev.items) }
          : prev
      );

      try {
        const list = previousLists.find((l) => l.id === listId);
        if (!list) throw new Error("List not found");
        const updatedItems = toggleInItems(list.items);
        const res = await fetch(`/api/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!res.ok) throw new Error("Failed to toggle item");
        const json = await res.json();
        const updated = (json.list ?? json) as ShoppingList;
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? updated : l))
        );
        setCurrentList((prev) =>
          prev?.id === listId ? updated : prev
        );
      } catch (err) {
        // Rollback on failure
        setLists(previousLists);
        setCurrentList(previousCurrent);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [lists, currentList]
  );

  /**
   * Optimistically add an item to a shopping list.
   * Rolls back on failure.
   */
  const addItem = useCallback(
    async (listId: string, item: ShoppingListItem) => {
      const previousLists = lists;
      const previousCurrent = currentList;

      // Optimistic update
      const addToList = (items: ShoppingListItem[]) => [...items, item];

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, items: addToList(l.items) } : l
        )
      );
      setCurrentList((prev) =>
        prev?.id === listId
          ? { ...prev, items: addToList(prev.items) }
          : prev
      );

      try {
        const list = previousLists.find((l) => l.id === listId);
        if (!list) throw new Error("List not found");
        const updatedItems = addToList(list.items);
        const res = await fetch(`/api/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!res.ok) throw new Error("Failed to add item");
        const json = await res.json();
        const updated = (json.list ?? json) as ShoppingList;
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? updated : l))
        );
        setCurrentList((prev) =>
          prev?.id === listId ? updated : prev
        );
      } catch (err) {
        // Rollback on failure
        setLists(previousLists);
        setCurrentList(previousCurrent);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [lists, currentList]
  );

  /**
   * Optimistically remove an item from a shopping list.
   * Rolls back on failure.
   */
  const removeItem = useCallback(
    async (listId: string, itemId: string) => {
      const previousLists = lists;
      const previousCurrent = currentList;

      // Optimistic update
      const removeFromItems = (items: ShoppingListItem[]) =>
        items.filter((item) => item.id !== itemId);

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, items: removeFromItems(l.items) }
            : l
        )
      );
      setCurrentList((prev) =>
        prev?.id === listId
          ? { ...prev, items: removeFromItems(prev.items) }
          : prev
      );

      try {
        const list = previousLists.find((l) => l.id === listId);
        if (!list) throw new Error("List not found");
        const updatedItems = removeFromItems(list.items);
        const res = await fetch(`/api/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!res.ok) throw new Error("Failed to remove item");
        const json = await res.json();
        const updated = (json.list ?? json) as ShoppingList;
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? updated : l))
        );
        setCurrentList((prev) =>
          prev?.id === listId ? updated : prev
        );
      } catch (err) {
        // Rollback on failure
        setLists(previousLists);
        setCurrentList(previousCurrent);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [lists, currentList]
  );

  /**
   * Set the currently active list.
   */
  const selectList = useCallback((list: ShoppingList | null) => {
    setCurrentList(list);
  }, []);

  // Auto-fetch on mount when userId is provided
  useEffect(() => {
    if (userId) {
      fetchLists(userId);
    }
  }, [userId, fetchLists]);

  return {
    lists,
    currentList,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
    toggleItem,
    addItem,
    removeItem,
    selectList,
  };
}
