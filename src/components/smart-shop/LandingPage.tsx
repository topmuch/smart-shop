"use client";

/**
 * Smart Shop - Landing Page
 * Hero, Features, How It Works, Testimonials, CTA sections.
 * Optimized for SEO and conversion.
 */

import { motion } from "framer-motion";
import {
  ScanBarcode,
  ListChecks,
  PiggyBank,
  Smartphone,
  Shield,
  Zap,
  ArrowRight,
  Star,
  CheckCircle2,
  ChevronRight,
  ShoppingCart,
  BarChart3,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ============================================================
   Animation Variants
   ============================================================ */

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: "easeOut" },
};

/* ============================================================
   Types
   ============================================================ */

interface LandingPageProps {
  onNavigate: (view: "login" | "register") => void;
}

/* ============================================================
   Landing Page Component
   ============================================================ */

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ====== HEADER ====== */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
              <ShoppingCart className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">
              Smart Shop
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("login")}
              className="hidden sm:inline-flex"
            >
              Connexion
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate("register")}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Commencer
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </nav>
        </div>
      </header>

      {/* ====== HERO SECTION ====== */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-50/50 via-background to-background dark:from-green-950/20 dark:via-background" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8 md:gap-12 items-center"
          >
            {/* Left: Text Content */}
            <div className="flex flex-col gap-6">
              <motion.div variants={fadeInUp}>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-4 inline-flex"
                >
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Nouveau — Scanner de codes-barres intelligent
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              >
                Vos courses
                <span className="text-green-500 block">simplifiées</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed"
              >
                Scannez vos produits, suivez votre budget en temps réel et
                organisez vos listes de courses. L&apos;assistant intelligent
                qui vous fait gagner du temps et de l&apos;argent.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-3 mt-2"
              >
                <Button
                  size="lg"
                  onClick={() => onNavigate("register")}
                  className="bg-green-500 hover:bg-green-600 text-white h-12 text-base px-8"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 text-base px-8"
                >
                  En savoir plus
                  <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="flex items-center gap-4 mt-4"
              >
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <span className="text-muted-foreground">
                    Rejoint par +2 500 utilisateurs
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: Hero Illustration */}
            <motion.div variants={scaleIn} className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20">
                <img
                  src="/hero-illustration.png"
                  alt="Smart Shop - Scanner de courses intelligent"
                  className="w-full h-auto object-cover"
                  loading="eager"
                />
                {/* Floating stat cards */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 border"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <PiggyBank className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Économisé ce mois
                      </p>
                      <p className="text-sm font-bold text-green-600">
                        -23,50 €
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 border"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                      <ScanBarcode className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Produits scannés
                      </p>
                      <p className="text-sm font-bold">47 articles</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            >
              Tout ce dont vous avez besoin
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Une suite complète d&apos;outils pour transformer vos courses en
              une expérience simple et économique.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <FeatureCard {...feature} index={index} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            >
              Comment ça marche ?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              En 3 étapes simples, optimisez toutes vos courses.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((step, index) => (
              <motion.div key={step.title} variants={fadeInUp}>
                <div className="relative text-center">
                  {/* Step number */}
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-500 text-white font-bold text-lg mb-4">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-green-300 to-green-100 dark:from-green-700 dark:to-green-900" />
                  )}
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== STATS / SOCIAL PROOF ====== */}
      <section className="py-16 md:py-20 bg-green-500 text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp}>
                <p className="text-3xl md:text-4xl font-bold mb-1">
                  {stat.value}
                </p>
                <p className="text-green-100 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            >
              Ce qu&apos;en disent nos utilisateurs
            </motion.h2>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeInUp}>
                <Card className="h-full border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 mb-4 italic">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== CTA SECTION ====== */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            >
              Prêt à optimiser vos courses ?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto"
            >
              Rejoignez des milliers d&apos;utilisateurs qui économisent chaque
              jour avec Smart Shop. Gratuit, sans engagement.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                size="lg"
                onClick={() => onNavigate("register")}
                className="bg-green-500 hover:bg-green-600 text-white h-12 text-base px-8"
              >
                Commencer gratuitement
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate("login")}
                className="h-12 text-base px-8"
              >
                J&apos;ai déjà un compte
              </Button>
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Gratuit
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-500" />
                Données sécurisées
              </div>
              <div className="flex items-center gap-1">
                <Smartphone className="h-4 w-4 text-green-500" />
                Mobile-first
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center">
                <ShoppingCart className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">Smart Shop</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Smart Shop. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Mentions légales</span>
              <span>Confidentialité</span>
              <span>CGU</span>
              <span
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => { window.location.hash = "#/admin"; }}
              >
                Admin
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Feature Card Component
   ============================================================ */

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  index: number;
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
}: FeatureCardProps) {
  return (
    <Card className="h-full border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group">
      <CardContent className="p-6">
        <div
          className={`h-12 w-12 rounded-xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Data
   ============================================================ */

const features = [
  {
    title: "Scanner de codes-barres",
    description:
      "Scannez instantanément n'importe quel produit grâce à la caméra de votre téléphone. Prix, catégorie et informations automatiques.",
    icon: ScanBarcode,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    title: "Listes intelligentes",
    description:
      "Créez et organisez vos listes de courses par catégorie. Cochez les articles au fur et à mesure, partagez-les avec votre famille.",
    icon: ListChecks,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    title: "Budget en temps réel",
    description:
      "Suivez vos dépenses course par course. Alertes lorsque vous approchez de votre budget, historique complet des achats.",
    icon: PiggyBank,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  {
    title: "Dashboard analytique",
    description:
      "Visualisez vos habitudes d'achat avec des graphiques détaillés. Repérez les catégories où vous dépensez le plus.",
    icon: BarChart3,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    title: "Tickets de caisse digitaux",
    description:
      "Générez des tickets de caisse PDF de vos sessions de courses. Exportez en CSV pour un suivi comptable.",
    icon: Receipt,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
  {
    title: "Fonctionne hors ligne",
    description:
      "Continuez à scanner et lister même sans connexion internet. Synchronisation automatique dès que le réseau revient.",
    icon: Smartphone,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
];

const steps = [
  {
    number: 1,
    title: "Créez votre compte",
    description:
      "Inscription gratuite en 30 secondes. Aucune carte bancaire requise.",
  },
  {
    number: 2,
    title: "Scannez vos achats",
    description:
      "Utilisez la caméra pour scanner les codes-barres. Les prix s'ajoutent automatiquement.",
  },
  {
    number: 3,
    title: "Suivez et économisez",
    description:
      "Consultez votre budget en temps réel, identifiez les économies possibles.",
  },
];

const stats = [
  { value: "2 500+", label: "Utilisateurs actifs" },
  { value: "50K+", label: "Produits scannés" },
  { value: "15K€", label: "Économies réalisées" },
  { value: "4.8/5", label: "Note moyenne" },
];

const testimonials = [
  {
    name: "Marie L.",
    role: "Mère de famille, Lyon",
    text: "Smart Shop m'a permis de réduire mes dépenses courses de 20%. Le scanner est super rapide et le suivi budget est indispensable !",
  },
  {
    name: "Thomas R.",
    role: "Étudiant, Paris",
    text: "Enfin une app qui me permet de suivre mes dépenses alimentaires. L'interface est simple et les graphiques très clairs.",
  },
  {
    name: "Sophie M.",
    role: "Professionnelle, Bordeaux",
    text: "J'adore la fonctionnalité hors ligne ! Je peux scanner mes courses même dans les supermarchés sans réseau.",
  },
];
