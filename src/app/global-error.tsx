'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Erreur critique</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            L&apos;application a rencontré une erreur critique. Veuillez recharger la page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
