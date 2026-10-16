import { rowErrorText } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import type { ParsedRow } from '../lib/csv/mapping';
import { formatDisplay } from '../lib/csv/values';
import { summarize } from '../lib/summary';

export interface PreviewRow extends ParsedRow {
  included: boolean;
  flipped: boolean;
}

interface Props {
  rows: PreviewRow[];
  onToggle(rowNumber: number): void;
  onFlip(rowNumber: number): void;
}

export function Preview({ rows, onToggle, onFlip }: Props) {
  const { t, locale } = useI18n();
  const money = (cents: number) => formatDisplay(cents, locale);
  const statusLabel = { new: t.preview.statusNew, duplicate: t.preview.statusDuplicate, invalid: t.preview.statusInvalid };
  const summary = summarize(rows);
  return (
    <>
      <dl className="summary">
        <div><dt>{t.preview.selectedLabel}</dt><dd>{t.preview.selected(summary.count, rows.length)}</dd></div>
        <div><dt>{t.preview.debit}</dt><dd className="negative">{money(summary.debitCents)}</dd></div>
        <div><dt>{t.preview.credit}</dt><dd className="positive">{money(summary.creditCents)}</dd></div>
        <div><dt>{t.preview.net}</dt><dd>{money(summary.netCents)}</dd></div>
      </dl>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th aria-label={t.preview.include} />
              <th>{t.preview.line}</th>
              <th>{t.preview.date}</th>
              <th>{t.preview.description}</th>
              <th className="num">{t.preview.amount}</th>
              <th>{t.preview.status}</th>
              <th aria-label={t.preview.actions} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rowNumber} className={`status-${r.status}`}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={t.preview.includeLine(r.rowNumber)}
                    checked={r.included}
                    disabled={r.status === 'invalid'}
                    onChange={() => onToggle(r.rowNumber)}
                  />
                </td>
                <td className="muted">{r.rowNumber}</td>
                <td>{r.date}</td>
                <td>{r.message}</td>
                <td className={`num ${r.amountCents < 0 ? 'negative' : 'positive'}`}>{r.status === 'invalid' ? '' : money(r.amountCents)}</td>
                <td><span className={`badge ${r.status}`}>{statusLabel[r.status]}</span>{r.error && <span className="muted"> {rowErrorText(t, r.error)}</span>}</td>
                <td>
                  {r.status !== 'invalid' && (
                    <button type="button" className="link" title={t.preview.flip} aria-label={t.preview.flip} onClick={() => onFlip(r.rowNumber)}>
                      ± {r.flipped ? t.preview.flipped : ''}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
