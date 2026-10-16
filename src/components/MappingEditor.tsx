import { useId, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Mapping, SignMode } from '../lib/csv/mapping';
import { DATE_FORMATS, type DecimalStyle } from '../lib/csv/values';
import type { Sample, SampleValue } from './mappingSample';

interface Props {
  headers: string[];
  mapping: Mapping;
  sample: Sample | null;
  onChange(mapping: Mapping): void;
}

function ColumnSelect({ headers, value, label, onSelect }: { headers: string[]; value: string; label: string; onSelect(v: string): void }) {
  const { t } = useI18n();
  return (
    <select value={value} aria-label={label} onChange={(e) => onSelect(e.target.value)}>
      {!headers.includes(value) && <option value={value}>{t.mapping.choose}</option>}
      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  );
}

function SampleCell({ value }: { value: SampleValue | undefined }) {
  if (!value) return <div className="map-sample" />;
  if (value.error) return <div className="map-sample error">{value.error}</div>;
  const text = value.result !== null && value.result !== value.raw ? `${value.raw} → ${value.result}` : value.raw;
  return <div className="map-sample muted">{text}</div>;
}

function FieldRow({ label, sample, children }: { label: string; sample: SampleValue | undefined; children: ReactNode }) {
  return (
    <div className="map-row" role="group" aria-label={label}>
      <span className="map-label">{label}</span>
      <div className="map-controls">{children}</div>
      <SampleCell value={sample} />
    </div>
  );
}

function DescriptionPicker({ headers, columns, onChange }: { headers: string[]; columns: string[]; onChange(columns: string[]): void }) {
  const { t } = useI18n();
  const available = headers.filter((h) => !columns.includes(h));
  return (
    <div className="chips">
      {columns.map((c) => (
        <span key={c} className="chip">
          {c}
          <button type="button" aria-label={t.mapping.removeColumn(c)} onClick={() => onChange(columns.filter((x) => x !== c))}>×</button>
        </span>
      ))}
      {available.length > 0 && (
        <select value="" aria-label={t.mapping.addColumn} onChange={(e) => e.target.value && onChange([...columns, e.target.value])}>
          <option value="">{t.mapping.addColumn}</option>
          {available.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      )}
    </div>
  );
}

const hasAdvanced = (m: Mapping) => m.invertSign || !!m.foreignAmount || m.skipRules.length > 0;

export function MappingEditor({ headers, mapping, sample, onChange }: Props) {
  const { t } = useI18n();
  // Captured once: toggling an option off shouldn't collapse the section under the user's cursor.
  const [advancedOpen] = useState(() => hasAdvanced(mapping));
  const signName = useId();
  const set = (patch: Partial<Mapping>) => onChange({ ...mapping, ...patch });
  const sign = mapping.signMode;
  const setSign = (patch: Partial<Extract<SignMode, { kind: 'debitCreditColumn' }>>) =>
    sign.kind === 'debitCreditColumn' && set({ signMode: { ...sign, ...patch } });
  const foreign = mapping.foreignAmount;

  return (
    <>
      <div className="map-grid">
        <FieldRow label={t.mapping.fieldDate} sample={sample?.date}>
          <ColumnSelect headers={headers} label={t.mapping.dateColumn} value={mapping.dateColumn} onSelect={(dateColumn) => set({ dateColumn })} />
          <select aria-label={t.mapping.dateFormat} value={mapping.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as Mapping['dateFormat'] })}>
            <option value="auto">{t.mapping.autoDetect}</option>
            {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </FieldRow>

        <FieldRow label={t.mapping.fieldAmount} sample={sample?.amount}>
          <ColumnSelect headers={headers} label={t.mapping.amountColumn} value={mapping.amountColumn} onSelect={(amountColumn) => set({ amountColumn })} />
          <select aria-label={t.mapping.decimalStyle} value={mapping.decimalStyle} onChange={(e) => set({ decimalStyle: e.target.value as DecimalStyle })}>
            <option value="comma">1.234,56</option>
            <option value="dot">1,234.56</option>
          </select>
          <div className="sign-options" role="radiogroup" aria-label={t.mapping.sign}>
            <label className="inline">
              <input type="radio" name={signName} checked={sign.kind === 'signed'} onChange={() => set({ signMode: { kind: 'signed' } })} />
              {t.mapping.signSigned}
            </label>
            <label className="inline">
              <input
                type="radio"
                name={signName}
                checked={sign.kind === 'debitCreditColumn'}
                onChange={() => set({ signMode: { kind: 'debitCreditColumn', column: headers[0] ?? '', debitValue: 'D', creditValue: 'C' } })}
              />
              {t.mapping.signDebitCredit}
            </label>
          </div>
          {sign.kind === 'debitCreditColumn' && (
            <div className="sign-column">
              <ColumnSelect headers={headers} label={t.mapping.debitCreditColumn} value={sign.column} onSelect={(column) => setSign({ column })} />
              <label className="inline">
                {t.mapping.debitValue}
                <input className="short" value={sign.debitValue} onChange={(e) => setSign({ debitValue: e.target.value })} />
              </label>
              <label className="inline">
                {t.mapping.creditValue}
                <input className="short" value={sign.creditValue} onChange={(e) => setSign({ creditValue: e.target.value })} />
              </label>
            </div>
          )}
        </FieldRow>

        <FieldRow label={t.mapping.fieldDescription} sample={sample?.description}>
          <DescriptionPicker headers={headers} columns={mapping.descriptionColumns} onChange={(descriptionColumns) => set({ descriptionColumns })} />
        </FieldRow>
      </div>

      <details className="more-options" open={advancedOpen}>
        <summary>{t.mapping.moreOptions}</summary>

        <label className="inline">
          <input type="checkbox" checked={mapping.invertSign} onChange={(e) => set({ invertSign: e.target.checked })} />
          {t.mapping.invertSign}
        </label>

        <fieldset>
          <legend>
            <label className="inline">
              <input
                type="checkbox"
                checked={!!foreign}
                onChange={(e) => set({
                  foreignAmount: e.target.checked ? { amountColumn: headers[0] ?? '', currencyColumn: headers[0] ?? '', baseCurrency: 'EUR' } : null,
                })}
              />
              {t.mapping.foreignToggle}
            </label>
          </legend>
          {foreign && (
            <div className="fields">
              <label>
                {t.mapping.foreignAmountColumn}
                <ColumnSelect headers={headers} label={t.mapping.foreignAmountColumn} value={foreign.amountColumn} onSelect={(amountColumn) => set({ foreignAmount: { ...foreign, amountColumn } })} />
              </label>
              <label>
                {t.mapping.currencyColumn}
                <ColumnSelect headers={headers} label={t.mapping.currencyColumn} value={foreign.currencyColumn} onSelect={(currencyColumn) => set({ foreignAmount: { ...foreign, currencyColumn } })} />
              </label>
              <label>
                {t.mapping.baseCurrency}
                <input className="short" value={foreign.baseCurrency} onChange={(e) => set({ foreignAmount: { ...foreign, baseCurrency: e.target.value } })} />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>{t.mapping.skipLegend}</legend>
          {mapping.skipRules.map((rule, i) => (
            <div key={i} className="fields rule">
              <ColumnSelect
                headers={headers}
                label={t.mapping.skipLegend}
                value={rule.column}
                onSelect={(column) => set({ skipRules: mapping.skipRules.map((r, j) => (j === i ? { ...r, column } : r)) })}
              />
              <span>{t.mapping.equals}</span>
              <input
                aria-label={t.mapping.equals}
                value={rule.equals}
                onChange={(e) => set({ skipRules: mapping.skipRules.map((r, j) => (j === i ? { ...r, equals: e.target.value } : r)) })}
              />
              <button type="button" onClick={() => set({ skipRules: mapping.skipRules.filter((_, j) => j !== i) })}>{t.mapping.remove}</button>
            </div>
          ))}
          <button type="button" onClick={() => set({ skipRules: [...mapping.skipRules, { column: headers[0] ?? '', equals: '' }] })}>
            {t.mapping.addRule}
          </button>
        </fieldset>
      </details>
    </>
  );
}
