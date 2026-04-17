"use client";

/**
 * Smart Shop - Auth Views
 * Login, Register, and Forgot Password forms.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowLeft,
  Eye,
  EyeOff,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ============================================================
   Types
   ============================================================ */

export type AuthView = "login" | "register" | "forgot-password";

interface AuthViewsProps {
  initialView?: AuthView;
  onNavigate: (view: AuthView) => void;
  onBack: () => void;
  loginFn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerFn: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}

/* ============================================================
   Main Auth Component
   ============================================================ */

export function AuthViews({
  initialView = "login",
  onNavigate,
  onBack,
  loginFn,
  registerFn,
}: AuthViewsProps) {
  const [view, setView] = useState<AuthView>(initialView);

  const handleViewChange = (v: AuthView) => {
    setView(v);
    onNavigate(v);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-4 md:px-8">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-3">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold">Smart Shop</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {view === "login" && (
              <LoginForm
                key="login"
                onGoRegister={() => handleViewChange("register")}
                onGoForgot={() => handleViewChange("forgot-password")}
                loginFn={loginFn}
              />
            )}
            {view === "register" && (
              <RegisterForm
                key="register"
                onGoLogin={() => handleViewChange("login")}
                registerFn={registerFn}
              />
            )}
            {view === "forgot-password" && (
              <ForgotPasswordForm
                key="forgot"
                onGoLogin={() => handleViewChange("login")}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Smart Shop — Tous droits réservés
        </p>
      </footer>
    </div>
  );
}

/* ============================================================
   Login Form
   ============================================================ */

function LoginForm({
  onGoRegister,
  onGoForgot,
  loginFn,
}: {
  onGoRegister: () => void;
  onGoForgot: () => void;
  loginFn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    const result = await loginFn(email, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? "Erreur de connexion");
    }
    // On success, the auth store updates and the router switches to app view
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-2 pt-8 px-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <Mail className="h-7 w-7 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace Smart Shop
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg p-3 border border-red-200 dark:border-red-900/50"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button
                  type="button"
                  onClick={onGoForgot}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  disabled={isLoading}
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
              className="w-full bg-green-500 hover:bg-green-600 text-white h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <button
                onClick={onGoRegister}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Créer un compte
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Register Form
   ============================================================ */

function RegisterForm({
  onGoLogin,
  registerFn,
}: {
  onGoLogin: () => void;
  registerFn: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsLoading(true);
    const result = await registerFn(name, email, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? "Erreur d'inscription");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-2 pt-8 px-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <User className="h-7 w-7 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-sm text-muted-foreground">
            Commencez à optimiser vos courses
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg p-3 border border-red-200 dark:border-red-900/50"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  disabled={isLoading}
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
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.level
                            ? passwordStrength.color
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création du compte...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              En créant un compte, vous acceptez nos{" "}
              <span className="underline cursor-pointer">CGU</span> et notre{" "}
              <span className="underline cursor-pointer">
                politique de confidentialité
              </span>
              .
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <button
                onClick={onGoLogin}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Se connecter
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Forgot Password Form
   ============================================================ */

function ForgotPasswordForm({ onGoLogin }: { onGoLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Veuillez entrer votre adresse email");
      return;
    }

    setIsLoading(true);
    // Simulate sending reset email (MVP: just show success)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-2 pt-8 px-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
            <Lock className="h-7 w-7 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            {isSent
              ? "Vérifiez votre boîte mail"
              : "Entrez votre email pour réinitialiser votre mot de passe"}
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          {isSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec <strong>{email}</strong>, vous
                recevrez un email avec les instructions pour réinitialiser votre
                mot de passe.
              </p>
              <Button
                variant="outline"
                onClick={onGoLogin}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la connexion
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg p-3 border border-red-200 dark:border-red-900/50">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer le lien
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={onGoLogin}
                  className="text-sm text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Password Strength Helper
   ============================================================ */

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
} {
  if (!password) return { level: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1)
    return { level: 1, label: "Faible", color: "bg-red-500" };
  if (score <= 2)
    return { level: 2, label: "Moyen", color: "bg-orange-500" };
  if (score <= 3)
    return { level: 3, label: "Bon", color: "bg-yellow-500" };
  return { level: 4, label: "Excellent", color: "bg-green-500" };
}
