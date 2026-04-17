"use client";

/**
 * Smart Shop - Main Application Page
 * Single-page application with tab-based navigation integrating all features:
 * Shopping Lists, Barcode Scanner, Cart/Budget, Dashboard, Settings
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart,
  ScanBarcode,
  LayoutDashboard,
  Settings,
  ListChecks,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OfflineIndicator } from "@/components/smart-shop/OfflineIndicator";
import { ShoppingListView } from "@/components/smart-shop/ShoppingListView";
import { ScannerView } from "@/components/smart-shop/ScannerView";
import { CartView } from "@/components/smart-shop/CartView";
import { DashboardView } from "@/components/smart-shop/DashboardView";
import { SettingsPanel } from "@/components/smart-shop/SettingsPanel";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import type { AppTab, UserProfile } from "@/types";

/* ============================================================
   Tab Navigation Configuration
   ============================================================ */

interface NavTab {
  id: AppTab;
  label: string;
  icon: React.ElementType;
}

const NAV_TABS: NavTab[] = [
  { id: "lists", label: "Listes", icon: ListChecks },
  { id: "scanner", label: "Scanner", icon: ScanBarcode },
  { id: "cart", label: "Panier", icon: ShoppingCart },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "settings", label: "Réglages", icon: Settings },
];

/* ============================================================
   Page Transition Variants
   ============================================================ */

const pageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

const pageTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/* ============================================================
   Main Application Component
   ============================================================ */

export default function SmartShopApp() {
  /* --- State --- */
  const [activeTab, setActiveTab] = useState<AppTab>("lists");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { isOnline, pendingCount, isSyncing } = useOfflineSync();

  /* --- Demo User Initialization --- */
  const initDemoUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create demo user");
      const data = await res.json();
      // API returns { user: {...} }, extract the nested user object
      const userObj = data.user ?? data;
      setUser(userObj);
    } catch (error) {
      console.error("Failed to initialize demo user:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initDemoUser();
  }, [initDemoUser]);

  /* --- Tab Change Handler --- */
  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }, []);

  /* --- Loading State --- */
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">
          Erreur de chargement. Veuillez actualiser la page.
        </p>
      </div>
    );
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ====== HEADER ====== */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
                <ShoppingCart className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight tracking-tight">
                  Smart Shop
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  Assistant Courses
                </span>
              </div>
            </div>

            {/* Plan Badge - desktop only */}
            <Badge
              variant={user.plan === "premium" ? "default" : "secondary"}
              className="hidden sm:inline-flex text-[10px] px-2 py-0"
            >
              {user.plan === "free"
                ? "Gratuit"
                : user.plan === "premium"
                  ? "Premium"
                  : "Famille"}
            </Badge>
          </div>

          {/* Right: Offline indicator + mobile menu toggle */}
          <div className="flex items-center gap-3">
            <OfflineIndicator
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
            />

            {/* Mobile hamburger menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={
                mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"
              }
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* ====== DESKTOP TOP NAV ====== */}
        <nav
          className="hidden md:flex items-center gap-1 px-4 pb-2"
          role="tablist"
          aria-label="Navigation principale"
        >
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
                  isActive
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ====== MOBILE DROPDOWN NAV ====== */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t"
            >
              <nav
                className="flex flex-col p-2 gap-1"
                role="tablist"
                aria-label="Navigation mobile"
              >
                {NAV_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                        isActive
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="flex-1 pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-label={NAV_TABS.find((t) => t.id === activeTab)?.label}
            >
              {renderActiveTab(activeTab, user)}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ====== MOBILE BOTTOM NAV BAR ====== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md"
        role="tablist"
        aria-label="Navigation inférieure"
      >
        <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all duration-200 min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                  isActive
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isActive && "scale-110"
                    )}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-green-500"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive && "font-semibold"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ============================================================
   Tab Content Renderer
   ============================================================ */

function renderActiveTab(tab: AppTab, user: UserProfile) {
  switch (tab) {
    case "lists":
      return <ShoppingListView userId={user.id} />;
    case "scanner":
      return <ScannerView userId={user.id} />;
    case "cart":
      return <CartView userId={user.id} />;
    case "dashboard":
      return (
        <DashboardView
          userId={user.id}
          isPremium={user.plan !== "free"}
        />
      );
    case "settings":
      return (
        <SettingsPanel
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
        />
      );
    default:
      return <ShoppingListView userId={user.id} />;
  }
}

/* ============================================================
   Loading Screen
   ============================================================ */

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col">
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
        <div className="hidden md:flex items-center gap-1 px-4 pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
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

      {/* Bottom nav skeleton */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background h-16">
        <div className="flex items-center justify-around h-full px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-2.5 w-10 rounded" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
