import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground">Page non trouvée</p>
      <Link
        href="/"
        className="text-primary hover:underline flex items-center gap-2"
      >
        <Home className="h-4 w-4" />
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
