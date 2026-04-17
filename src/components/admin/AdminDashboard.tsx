"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  TrendingUp,
  ShoppingBag,
  UserCheck,
  ScanBarcode,
  Shield,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  createdAt: string;
  _count?: { shoppingSessions: number; shoppingLists: number };
}

interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  category: string;
  brand?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string;
  source?: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  premiumCount: number;
  scansToday: number;
  totalProducts: number;
  recentUsers: Array<{
    id: string;
    email: string;
    name?: string | null;
    plan: string;
    createdAt: string;
  }>;
  revenueMonthly: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

type NavView =
  | "dashboard"
  | "users"
  | "products"
  | "subscriptions"
  | "config"
  | "logs";

// ─── Config metadata ────────────────────────────────────────────────────────

const CONFIG_ITEMS: Array<{
  key: string;
  label: string;
  type: "number" | "switch" | "text";
  description: string;
}> = [
  {
    key: "free_max_lists",
    label: "Listes max (gratuit)",
    type: "number",
    description: "Nombre maximal de listes de courses pour les utilisateurs gratuits",
  },
  {
    key: "free_max_scans_per_session",
    label: "Scans max par session (gratuit)",
    type: "number",
    description: "Nombre maximal de scans par session pour les utilisateurs gratuits",
  },
  {
    key: "free_history_days",
    label: "Historique (jours, gratuit)",
    type: "number",
    description: "Durée de rétention de l'historique en jours pour les utilisateurs gratuits",
  },
  {
    key: "maintenance_mode",
    label: "Mode maintenance",
    type: "switch",
    description: "Activer le mode maintenance — les utilisateurs voient un message d'indisponibilité",
  },
  {
    key: "maintenance_message",
    label: "Message de maintenance",
    type: "text",
    description: "Message affiché aux utilisateurs pendant la maintenance",
  },
];

// ─── Category options ───────────────────────────────────────────────────────

const PRODUCT_CATEGORIES = [
  "Fruits & Légumes",
  "Boulangerie",
  "Produits Laitiers",
  "Viandes & Poissons",
  "Épicerie",
  "Boissons",
  "Surgelés",
  "Hygiène & Beauté",
  "Maison & Entretien",
  "Autre",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  // ── Auth state ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Navigation ──
  const [activeView, setActiveView] = useState<NavView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Dashboard stats ──
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Users ──
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearchTimeout, setUsersSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // ── Products ──
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPagination, setProductsPagination] = useState<Pagination | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [productsSearch, setProductsSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsSearchTimeout, setProductsSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    barcode: "",
    name: "",
    price: "",
    category: "Autre",
    brand: "",
  });
  const [addProductLoading, setAddProductLoading] = useState(false);
  const [deleteProductBarcode, setDeleteProductBarcode] = useState<string | null>(null);
  const [deleteProductLoading, setDeleteProductLoading] = useState(false);

  // ── Subscriptions ──
  const [subscriptions, setSubscriptions] = useState<AdminUser[]>([]);
  const [subsPagination, setSubsPagination] = useState<Pagination | null>(null);
  const [subsPage, setSubsPage] = useState(1);
  const [subsPlanFilter, setSubsPlanFilter] = useState<string>("all");
  const [subsLoading, setSubsLoading] = useState(false);
  const [planSummary, setPlanSummary] = useState<Record<string, number>>({});

  // ── Config ──
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  // ── Logs ──
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsPagination, setLogsPagination] = useState<{ limit: number; offset: number; total: number } | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLevel, setLogsLevel] = useState<string>("all");
  const [logsLoading, setLogsLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Auth checks
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/me");
        if (res.ok) {
          const data = await res.json();
          if (data.admin) {
            setIsLoggedIn(true);
          }
        }
      } catch {
        // not logged in
      } finally {
        setIsAdminLoading(false);
      }
    }
    checkSession();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Login handler
  // ─────────────────────────────────────────────────────────────────────────

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de connexion");
        return;
      }
      setIsLoggedIn(true);
      toast.success(`Bienvenue, ${data.admin.name || data.admin.email}`);
    } catch {
      toast.error("Erreur réseau — veuillez réessayer");
    } finally {
      setLoginLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logout handler
  // ─────────────────────────────────────────────────────────────────────────

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // proceed regardless
    }
    setIsLoggedIn(false);
    onLogout();
    toast.success("Déconnexion réussie");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Stats
  // ─────────────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) setStats(data);
      else toast.error(data.error || "Erreur de chargement des statistiques");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Users
  // ─────────────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (page: number, search: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setUsersPagination(data.pagination);
      } else {
        toast.error(data.error || "Erreur de chargement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Products
  // ─────────────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (page: number, search: string) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/products?${params}`);
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products);
        setProductsPagination(data.pagination);
      } else {
        toast.error(data.error || "Erreur de chargement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  const fetchSubscriptions = useCallback(async (page: number, plan: string) => {
    setSubsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (plan !== "all") params.set("plan", plan);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setSubscriptions(data.subscriptions);
        setPlanSummary(data.planSummary);
        setSubsPagination(data.pagination);
      } else {
        toast.error(data.error || "Erreur de chargement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Config
  // ─────────────────────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) setConfigData(data.config);
      else toast.error(data.error || "Erreur de chargement");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Logs
  // ─────────────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (page: number, level: string) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", offset: String((page - 1) * 50) });
      if (level !== "all") params.set("level", level);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setLogsPagination(data.pagination);
      } else {
        toast.error(data.error || "Erreur de chargement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Blocked user IDs
  // ─────────────────────────────────────────────────────────────────────────

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        const blocked = data.config?.blocked_user_ids;
        if (blocked) {
          try {
            setBlockedUserIds(new Set(JSON.parse(blocked)));
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      // non-critical
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation effect — load data for the active view
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoggedIn) return;
    switch (activeView) {
      case "dashboard":
        fetchStats();
        break;
      case "users":
        fetchUsers(usersPage, usersSearch);
        fetchBlockedUsers();
        break;
      case "products":
        fetchProducts(productsPage, productsSearch);
        break;
      case "subscriptions":
        fetchSubscriptions(subsPage, subsPlanFilter);
        break;
      case "config":
        fetchConfig();
        break;
      case "logs":
        fetchLogs(logsPage, logsLevel);
        break;
    }
  }, [activeView]);

  // Re-fetch when page/search changes within a view
  useEffect(() => {
    if (!isLoggedIn || activeView !== "users") return;
    fetchUsers(usersPage, usersSearch);
  }, [usersPage]);

  useEffect(() => {
    if (!isLoggedIn || activeView !== "products") return;
    fetchProducts(productsPage, productsSearch);
  }, [productsPage]);

  useEffect(() => {
    if (!isLoggedIn || activeView !== "subscriptions") return;
    fetchSubscriptions(subsPage, subsPlanFilter);
  }, [subsPage, subsPlanFilter]);

  useEffect(() => {
    if (!isLoggedIn || activeView !== "logs") return;
    fetchLogs(logsPage, logsLevel);
  }, [logsPage, logsLevel]);

  // ─────────────────────────────────────────────────────────────────────────
  // User block/unblock
  // ─────────────────────────────────────────────────────────────────────────

  async function handleToggleBlock(user: AdminUser, block: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setBlockedUserIds((prev) => {
        const next = new Set(prev);
        if (block) next.add(user.id);
        else next.delete(user.id);
        return next;
      });
      toast.success(block ? `${user.email} bloqué` : `${user.email} débloqué`);
    } catch {
      toast.error("Erreur réseau");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add product
  // ─────────────────────────────────────────────────────────────────────────

  async function handleAddProduct(e: FormEvent) {
    e.preventDefault();
    if (!newProduct.barcode.trim() || !newProduct.name.trim() || !newProduct.price) {
      toast.error("Veuillez remplir le code-barres, le nom et le prix");
      return;
    }
    setAddProductLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: newProduct.barcode.trim(),
          name: newProduct.name.trim(),
          price: parseFloat(newProduct.price),
          category: newProduct.category,
          brand: newProduct.brand.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'ajout");
        return;
      }
      toast.success(`Produit "${data.product.name}" ajouté`);
      setNewProduct({ barcode: "", name: "", price: "", category: "Autre", brand: "" });
      setAddProductOpen(false);
      fetchProducts(productsPage, productsSearch);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAddProductLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete product
  // ─────────────────────────────────────────────────────────────────────────

  async function handleDeleteProduct() {
    if (!deleteProductBarcode) return;
    setDeleteProductLoading(true);
    try {
      const res = await fetch(
        `/api/admin/products?barcode=${encodeURIComponent(deleteProductBarcode)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la suppression");
        return;
      }
      toast.success("Produit supprimé");
      setDeleteProductBarcode(null);
      fetchProducts(productsPage, productsSearch);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeleteProductLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Save config
  // ─────────────────────────────────────────────────────────────────────────

  async function handleSaveConfig(key: string, value: string) {
    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de sauvegarde");
        return;
      }
      setConfigData((prev) => ({ ...prev, [key]: value }));
      toast.success("Configuration sauvegardée");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation items
  // ─────────────────────────────────────────────────────────────────────────

  const navItems: Array<{
    id: NavView;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "products", label: "Produits", icon: Package },
    { id: "subscriptions", label: "Abonnements", icon: CreditCard },
    { id: "config", label: "Configuration", icon: Settings },
    { id: "logs", label: "Logs", icon: FileText },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }

  function getPlanBadgeVariant(plan: string) {
    switch (plan) {
      case "premium":
        return "default" as const;
      case "family":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  }

  function getLevelBadgeColor(level: string) {
    switch (level) {
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "warn":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    }
  }

  function navigateTo(view: NavView) {
    setActiveView(view);
    setSidebarOpen(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Login
  // ─────────────────────────────────────────────────────────────────────────

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-2 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500 shadow-lg shadow-green-500/25">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Smart Shop Admin
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Connectez-vous pour accéder au panneau d&apos;administration
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@smartshop.app"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loginLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loginLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                disabled={loginLoading}
              >
                {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-medium">Identifiants de test :</span>{" "}
                admin@smartshop.app / admin1234
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Dashboard layout
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 flex flex-col
            bg-slate-900 text-white
            transform transition-transform duration-200 ease-in-out
            md:relative md:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Branding */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">Smart Shop</h1>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Administration
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-3">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`
                      flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                      transition-all duration-150
                      ${
                        isActive
                          ? "bg-green-500/15 text-green-400 shadow-sm"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`h-[18px] w-[18px] ${isActive ? "text-green-400" : "text-slate-400"}`} />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400" />
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-slate-700/50 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
            >
              <LogOut className="h-[18px] w-[18px] text-slate-400" />
              Déconnexion
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center gap-4 border-b bg-white px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {navItems.find((n) => n.id === activeView)?.label}
            </h2>
          </header>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {activeView === "dashboard" && renderDashboard()}
            {activeView === "users" && renderUsers()}
            {activeView === "products" && renderProducts()}
            {activeView === "subscriptions" && renderSubscriptions()}
            {activeView === "config" && renderConfigView()}
            {activeView === "logs" && renderLogsView()}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Dashboard View ──────────────────────────────────────────────────────

  function renderDashboard() {
    if (statsLoading || !stats) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }

    const statCards = [
      {
        label: "Total Utilisateurs",
        value: stats.totalUsers,
        icon: Users,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "Actifs Aujourd'hui",
        value: stats.activeUsersToday,
        icon: UserCheck,
        color: "text-green-600",
        bg: "bg-green-50",
      },
      {
        label: "Abonnés Premium",
        value: stats.premiumCount,
        icon: CreditCard,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      {
        label: "Scans Aujourd'hui",
        value: stats.scansToday,
        icon: ScanBarcode,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {card.label}
                      </p>
                      <p className="text-3xl font-bold tracking-tight mt-1">
                        {card.value.toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className={`rounded-xl p-2.5 ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Produits</p>
                  <p className="text-lg font-bold">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenus Mensuels</p>
                  <p className="text-lg font-bold">
                    {formatPrice(stats.revenueMonthly)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taux Premium</p>
                  <p className="text-lg font-bold">
                    {stats.totalUsers > 0
                      ? `${((stats.premiumCount / stats.totalUsers) * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Utilisateurs récents</CardTitle>
            <CardDescription>Les 5 derniers inscrits</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun utilisateur
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(u.plan)}>
                          {u.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(u.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Users View ──────────────────────────────────────────────────────────

  function renderUsers() {
    return (
      <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email ou nom..."
              value={usersSearch}
              onChange={(e) => {
                setUsersSearch(e.target.value);
                setUsersPage(1);
                if (usersSearchTimeout) clearTimeout(usersSearchTimeout);
                setUsersSearchTimeout(
                  setTimeout(() => fetchUsers(1, e.target.value), 400)
                );
              }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Aucun utilisateur trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => {
                          const isBlocked = blockedUserIds.has(user.id);
                          return (
                            <TableRow key={user.id} className={isBlocked ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {user.email}
                                  {isBlocked && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      Bloqué
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{user.name || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={getPlanBadgeVariant(user.plan)}>
                                  {user.plan}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDate(user.createdAt)}
                              </TableCell>
                              <TableCell>{user._count?.shoppingSessions ?? 0}</TableCell>
                              <TableCell className="text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant={isBlocked ? "outline" : "ghost"}
                                      className={
                                        isBlocked
                                          ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                          : "text-red-600 hover:text-red-700 hover:bg-red-50"
                                      }
                                      onClick={() => handleToggleBlock(user, !isBlocked)}
                                    >
                                      {isBlocked ? (
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                      ) : (
                                        <Ban className="h-4 w-4 mr-1" />
                                      )}
                                      {isBlocked ? "Débloquer" : "Bloquer"}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isBlocked ? "Réactiver cet utilisateur" : "Bloquer cet utilisateur"}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {usersPagination && usersPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      {usersPagination.total} utilisateur(s) — Page {usersPagination.page} sur{" "}
                      {usersPagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={usersPagination.page <= 1}
                        onClick={() => setUsersPage((p) => p - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={usersPagination.page >= usersPagination.totalPages}
                        onClick={() => setUsersPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Products View ───────────────────────────────────────────────────────

  function renderProducts() {
    return (
      <div className="space-y-4">
        {/* Search + Add */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, code-barres ou marque..."
              value={productsSearch}
              onChange={(e) => {
                setProductsSearch(e.target.value);
                setProductsPage(1);
                if (productsSearchTimeout) clearTimeout(productsSearchTimeout);
                setProductsSearchTimeout(
                  setTimeout(() => fetchProducts(1, e.target.value), 400)
                );
              }}
              className="pl-9"
            />
          </div>
          <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un produit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un produit</DialogTitle>
                <DialogDescription>
                  Remplissez les informations du nouveau produit.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-barcode">Code-barres *</Label>
                  <Input
                    id="prod-barcode"
                    value={newProduct.barcode}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, barcode: e.target.value }))
                    }
                    placeholder="ex: 3017620422003"
                    disabled={addProductLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-name">Nom *</Label>
                  <Input
                    id="prod-name"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="ex: Nutella 400g"
                    disabled={addProductLoading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prod-price">Prix (€) *</Label>
                    <Input
                      id="prod-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct((p) => ({ ...p, price: e.target.value }))
                      }
                      placeholder="3.50"
                      disabled={addProductLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prod-category">Catégorie</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(v) =>
                        setNewProduct((p) => ({ ...p, category: v }))
                      }
                    >
                      <SelectTrigger id="prod-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-brand">Marque</Label>
                  <Input
                    id="prod-brand"
                    value={newProduct.brand}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, brand: e.target.value }))
                    }
                    placeholder="ex: Ferrero"
                    disabled={addProductLoading}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddProductOpen(false)}
                    disabled={addProductLoading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={addProductLoading}
                  >
                    {addProductLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code-barres</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Marque</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Aucun produit trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((prod) => (
                          <TableRow key={prod.id}>
                            <TableCell className="font-mono text-xs">
                              {prod.barcode}
                            </TableCell>
                            <TableCell className="font-medium">{prod.name}</TableCell>
                            <TableCell>{formatPrice(prod.price)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{prod.category}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {prod.brand || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteProductBarcode(prod.barcode)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {productsPagination && productsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      {productsPagination.total} produit(s) — Page{" "}
                      {productsPagination.page} sur {productsPagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={productsPagination.page <= 1}
                        onClick={() => setProductsPage((p) => p - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={productsPagination.page >= productsPagination.totalPages}
                        onClick={() => setProductsPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteProductBarcode}
          onOpenChange={(open) => {
            if (!open) setDeleteProductBarcode(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce produit (code-barres :{" "}
                <span className="font-mono font-semibold">
                  {deleteProductBarcode}
                </span>
                ) ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProductLoading}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProduct}
                disabled={deleteProductLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteProductLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Subscriptions View ──────────────────────────────────────────────────

  function renderSubscriptions() {
    const premiumCount = planSummary.premium ?? 0;
    const familyCount = planSummary.family ?? 0;
    const totalPaid = premiumCount + familyCount;
    const estimatedRevenue = premiumCount * 4.99 + familyCount * 9.99;

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total Premium
                  </p>
                  <p className="text-2xl font-bold mt-1">{premiumCount}</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-3">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Total Famille
                  </p>
                  <p className="text-2xl font-bold mt-1">{familyCount}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Revenus estimés
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatPrice(estimatedRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">/ mois</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Filtrer par plan :</Label>
          <Select value={subsPlanFilter} onValueChange={(v) => { setSubsPlanFilter(v); setSubsPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="family">Famille</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {totalPaid} abonné(s)
          </span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {subsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead>Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Aucun abonnement trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.email}</TableCell>
                            <TableCell>{sub.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={getPlanBadgeVariant(sub.plan)}>
                                {sub.plan === "premium" ? "⭐ Premium" : "👨‍👩‍👧 Famille"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(sub.createdAt)}
                            </TableCell>
                            <TableCell>{sub._count?.shoppingSessions ?? 0}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {subsPagination && subsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {subsPagination.page} sur {subsPagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={subsPagination.page <= 1}
                        onClick={() => setSubsPage((p) => p - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={subsPagination.page >= subsPagination.totalPages}
                        onClick={() => setSubsPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Configuration View ──────────────────────────────────────────────────

  function renderConfigView() {
    if (configLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-8 w-64" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration de l&apos;application</CardTitle>
            <CardDescription>
              Modifiez les paramètres globaux de l&apos;application. Les changements sont appliqués immédiatement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {CONFIG_ITEMS.map((item, idx) => {
              const currentValue = configData[item.key] ?? "";
              const isSaving = savingKeys.has(item.key);

              return (
                <React.Fragment key={item.key}>
                  {idx > 0 && <Separator />}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">{item.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                      <div className="mt-3">
                        {item.type === "number" && (
                          <Input
                            type="number"
                            className="max-w-[200px]"
                            defaultValue={currentValue}
                            id={`cfg-${item.key}`}
                          />
                        )}
                        {item.type === "switch" && (
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`cfg-${item.key}`}
                              defaultChecked={currentValue === "true"}
                            />
                            <Label htmlFor={`cfg-${item.key}`} className="text-sm">
                              {currentValue === "true" ? "Activé" : "Désactivé"}
                            </Label>
                          </div>
                        )}
                        {item.type === "text" && (
                          <textarea
                            id={`cfg-${item.key}`}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            defaultValue={currentValue}
                          />
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap self-start sm:self-center"
                      disabled={isSaving}
                      onClick={() => {
                        const el = document.getElementById(`cfg-${item.key}`);
                        let value: string;
                        if (item.type === "switch") {
                          value = (el as HTMLInputElement)?.checked ? "true" : "false";
                        } else {
                          value = (el as HTMLInputElement | HTMLTextAreaElement)?.value ?? "";
                        }
                        handleSaveConfig(item.key, value);
                      }}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </React.Fragment>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Logs View ───────────────────────────────────────────────────────────

  function renderLogsView() {
    const totalLogPages = logsPagination
      ? Math.ceil(logsPagination.total / 50)
      : 1;

    return (
      <div className="space-y-4">
        {/* Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Label className="text-sm text-muted-foreground">Filtrer par niveau :</Label>
          <Select value={logsLevel} onValueChange={(v) => { setLogsLevel(v); setLogsPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          {logsPagination && (
            <span className="text-sm text-muted-foreground">
              {logsPagination.total} entrée(s)
            </span>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Date</TableHead>
                        <TableHead className="w-24">Niveau</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Aucun log trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {formatDate(log.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getLevelBadgeColor(log.level)}`}
                              >
                                {log.level.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm max-w-md truncate">
                              {log.message}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalLogPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {logsPage} sur {totalLogPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={logsPage <= 1}
                        onClick={() => setLogsPage((p) => p - 1)}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={logsPage >= totalLogPages}
                        onClick={() => setLogsPage((p) => p + 1)}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}
