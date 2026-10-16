import { useI18n } from '../i18n/I18nProvider';
import type { ChunkResult } from '../lib/types';

interface Props {
  results: ChunkResult[];
  administrationId: string;
  onReset(): void;
}

export function Result({ results, administrationId, onReset }: Props) {
  const { t } = useI18n();
  const imported = results.filter((r) => r.ok).reduce((s, r) => s + r.count, 0);
  const failed = results.some((r) => !r.ok);
  const heading = !failed ? t.result.complete : imported === 0 ? t.result.failed : t.result.partial;
  return (
    <section className="card">
      <h2>{heading}</h2>
      <p>{t.result.imported(imported)}</p>
      <ul className="results">
        {results.map((r) => (
          <li key={r.reference} className={r.ok ? 'positive' : 'error'}>
            {r.ok ? '✓' : '✗'} {t.result.chunk(r.reference, r.count)}
            {!r.ok && r.error !== undefined && <pre>{JSON.stringify(r.error, null, 2)}</pre>}
          </li>
        ))}
      </ul>
      {failed && <p className="muted">{t.result.retryHint}</p>}
      <div className="actions">
        <a className="button" href={`https://moneybird.com/${administrationId}`} target="_blank" rel="noreferrer">{t.result.openMoneybird}</a>
        <button type="button" className="primary" onClick={onReset}>{t.result.another}</button>
      </div>
    </section>
  );
}
