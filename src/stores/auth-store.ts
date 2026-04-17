/**
 * Smart Shop - Auth Store (Zustand)
 * Client-side authentication state management.
 */

import { create } from "zustand";
import type { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error ?? "Erreur de connexion" };
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch {
      return { success: false, error: "Erreur réseau. Vérifiez votre connexion." };
    }
  },

  register: async (name, email, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error ?? "Erreur d'inscription" };
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch {
      return { success: false, error: "Erreur réseau. Vérifiez votre connexion." };
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Continue with local logout even if API fails
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
}));
