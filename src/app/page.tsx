"use client";

/**
 * Smart Shop - Main Page Router
 * Client-side routing between:
 * - Landing Page (unauthenticated visitors)
 * - Auth Views (login, register, forgot-password)
 * - App (authenticated users — full Smart Shop experience)
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { LandingPage } from "@/components/smart-shop/LandingPage";
import { AuthViews, type AuthView } from "@/components/smart-shop/AuthViews";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

/* ============================================================
   View types for client-side routing
   ============================================================ */

type UnauthView =
  | { type: "landing" }
  | { type: "auth"; authView: AuthView };

type EffectiveView =
  | { type: "loading" }
  | { type: "landing" }
  | { type: "auth"; authView: AuthView }
  | { type: "app" };

/* ============================================================
   Page Transition Variants
   ============================================================ */

const viewVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
};

/* ============================================================
   SmartShopApp Lazy Component
   ============================================================ */

const SmartShopAppLazy = dynamic(
  () =>
    import("@/components/smart-shop/SmartShopApp").then(
      (mod) => mod.SmartShopApp
    ),
  {
    loading: () => <AppLoadingScreen />,
    ssr: false,
  }
);

/* ============================================================
   Main Page Component
   ============================================================ */

export default function SmartShopPage() {
  const [unauthView, setUnauthView] = useState<UnauthView>({ type: "landing" });
  const { user, isLoading, isAuthenticated, checkSession, login, register, logout } =
    useAuthStore();

  /* --- Check session on mount --- */
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /* --- Derive effective view from auth state (no setState in effect) --- */
  const effectiveView: EffectiveView = useMemo(() => {
    if (isLoading) return { type: "loading" };
    if (isAuthenticated && user) return { type: "app" };
    return unauthView;
  }, [isLoading, isAuthenticated, user, unauthView]);

  /* --- Navigation handlers (only for unauthenticated state) --- */
  const handleLandingNavigate = useCallback(
    (authView: "login" | "register") => {
      setUnauthView({ type: "auth", authView });
    },
    []
  );

  const handleAuthNavigate = useCallback((authView: AuthView) => {
    setUnauthView({ type: "auth", authView });
  }, []);

  const handleAuthBack = useCallback(() => {
    setUnauthView({ type: "landing" });
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUnauthView({ type: "landing" });
  }, [logout]);

  /* ============================================================
     Render
     ============================================================ */
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={effectiveView.type === "auth" ? `auth-${effectiveView.authView}` : effectiveView.type}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={viewVariants.transition}
      >
        {effectiveView.type === "loading" && <SplashScreen />}

        {effectiveView.type === "landing" && (
          <LandingPage onNavigate={handleLandingNavigate} />
        )}

        {effectiveView.type === "auth" && (
          <AuthViews
            initialView={effectiveView.authView}
            onNavigate={handleAuthNavigate}
            onBack={handleAuthBack}
            loginFn={login}
            registerFn={register}
          />
        )}

        {effectiveView.type === "app" && user && (
          <SmartShopAppLazy
            userId={user.id}
            userName={user.name}
            userEmail={user.email}
            userPlan={user.plan}
            onLogout={handleLogout}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================
   Loading Screens
   ============================================================ */

function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-3"
      >
        <div className="h-14 w-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
          <svg
            className="h-7 w-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
            />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">Smart Shop</h1>
          <p className="text-xs text-muted-foreground">
            Assistant courses intelligent
          </p>
        </div>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "60%" }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="h-1 bg-green-500/30 rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-1/2 bg-green-500 rounded-full"
        />
      </motion.div>
    </div>
  );
}

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
