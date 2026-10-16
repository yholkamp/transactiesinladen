import { useEffect, type ReactNode } from 'react';
import type { Operator } from '../lib/operator';

export const LAST_UPDATED = '16 oktober 2026';

export function OperatorAddress({ operator }: { operator: Operator }) {
  return (
    <address>
      {operator.name}<br />
      {operator.street && <>{operator.street}<br /></>}
      {operator.city && <>{operator.city}<br /></>}
      {operator.kvk && <>KvK-nummer: {operator.kvk}<br /></>}
      E-mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
    </address>
  );
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} — ${window.location.hostname}`;
  }, [title]);

  return (
    <div className="app">
      <header>
        <a href="/">← Terug naar de tool</a>
      </header>
      <main>
        <article className="card legal" lang="nl">
          <h1>{title}</h1>
          <p className="muted">Laatst gewijzigd: {LAST_UPDATED}</p>
          {children}
        </article>
      </main>
    </div>
  );
}
