import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountPicker, type Selection } from './components/AccountPicker';
import { Connect } from './components/Connect';
import { MappingForm } from './components/MappingForm';
import { Preview, type PreviewRow } from './components/Preview';
import { Result } from './components/Result';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Upload } from './components/Upload';
import { apiErrorText } from './i18n';
import { useI18n } from './i18n/I18nProvider';
import { api, isUnauthorized, withRetry } from './lib/api';
import { applyMapping, type Mapping } from './lib/csv/mapping';
import type { CsvTable } from './lib/csv/parse';
import { initialMapping, saveMapping, type MappingSource } from './lib/csv/presets';
import { formatCents } from './lib/csv/values';
import { dateWindow, markDuplicates, type ExistingMutation } from './lib/dedupe';
import type { ChunkResult } from './lib/types';

interface LoadedFile {
  table: CsvTable;
  name: string;
  mappingSource: MappingSource;
  loadId: number;
}

export default function App() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [flips, setFlips] = useState<Set<number>>(new Set());
  const [existing, setExisting] = useState<ExistingMutation[] | null>(null);
  const [duplicateError, setDuplicateError] = useState<unknown>(null);
  const [reference, setReference] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ChunkResult[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { t } = useI18n();
  useEffect(() => {
    document.title = t.app.title;
  }, [t]);
  const urlError = useMemo(() => new URLSearchParams(window.location.search).get('error'), []);

  useEffect(() => {
    api.session().then((s) => setConnected(s.connected), () => setConnected(false));
  }, []);

  const disconnected = useCallback(() => setConnected(false), []);

  const parsed = useMemo(() => (file && mapping ? applyMapping(file.table, mapping) : []), [file, mapping]);
  const mapped = useMemo(
    () => parsed.map((r) => (flips.has(r.rowNumber) && r.status !== 'invalid' ? { ...r, amountCents: -r.amountCents } : r)),
    [parsed, flips],
  );
  const range = useMemo(() => dateWindow(mapped), [mapped]);

  const administrationId = selection?.administrationId;
  const accountId = selection?.accountId;
  useEffect(() => {
    setExisting(null);
    setDuplicateError(null);
    if (!administrationId || !accountId || !range) return;
    let cancelled = false;
    withRetry(() => api.mutations(administrationId, accountId, range.from, range.to)).then(
      (list) => { if (!cancelled) setExisting(list); },
      (e) => {
        if (cancelled) return;
        if (isUnauthorized(e)) disconnected();
        else setDuplicateError(e);
      },
    );
    return () => { cancelled = true; };
  }, [administrationId, accountId, range?.from, range?.to, reloadKey, disconnected]);

  const rows: PreviewRow[] = useMemo(() => {
    const checked = existing ? markDuplicates(mapped, existing) : mapped;
    return checked.map((r) => ({
      ...r,
      flipped: flips.has(r.rowNumber),
      included: r.status !== 'invalid' && (overrides[r.rowNumber] ?? r.status === 'new'),
    }));
  }, [mapped, existing, overrides, flips]);

  const defaultReference = file && range ? `CSV import ${file.name} ${range.minDate}–${range.maxDate}` : '';
  const effectiveReference = reference || defaultReference;
  const selected = rows.filter((r) => r.included);
  const canImport = !!selection && existing !== null && selected.length > 0 && !importing && effectiveReference.trim() !== '';

  function reset() {
    setFile(null);
    setMapping(null);
    setOverrides({});
    setFlips(new Set());
    setReference('');
    setResults(null);
  }

  function handleFile(table: CsvTable, name: string) {
    reset();
    const initial = initialMapping(table);
    setFile({ table, name, mappingSource: initial.source, loadId: (file?.loadId ?? 0) + 1 });
    setMapping(initial.mapping);
  }

  function handleMapping(next: Mapping) {
    setMapping(next);
    if (file) saveMapping(file.table.headers, next);
  }

  function toggle(rowNumber: number) {
    const row = rows.find((r) => r.rowNumber === rowNumber);
    if (row) setOverrides({ ...overrides, [rowNumber]: !row.included });
  }

  function flip(rowNumber: number) {
    const next = new Set(flips);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    setFlips(next);
  }

  async function handleImport() {
    if (!selection) return;
    setImporting(true);
    try {
      const { results } = await api.importStatement(selection.administrationId, {
        financial_account_id: selection.accountId,
        reference: effectiveReference.trim(),
        mutations: selected.map((r) => ({ date: r.date, message: r.message, amount: formatCents(r.amountCents) })),
      });
      setResults(results);
    } catch (e) {
      if (isUnauthorized(e)) disconnected();
      else setResults([{ reference: effectiveReference, count: selected.length, ok: false, error: apiErrorText(t, e) }]);
    } finally {
      setImporting(false);
      setOverrides({});
      setReloadKey((k) => k + 1);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    reset();
    setSelection(null);
    setConnected(false);
  }

  return (
    <div className="app">
      <header>
        <h1>{t.app.title}</h1>
        <div className="header-actions">
          <LanguageSwitcher />
          {connected && <button type="button" onClick={logout}>{t.app.disconnect}</button>}
        </div>
      </header>
      <main>
        {connected === false && <p className="intro">{t.app.intro}</p>}
        {connected === null && <p className="muted">{t.app.loading}</p>}
        {connected === false && <Connect error={urlError} />}
        {connected && (
          <>
            <AccountPicker onChange={setSelection} onUnauthorized={disconnected} />
            {results && selection ? (
              <Result results={results} administrationId={selection.administrationId} onReset={reset} />
            ) : (
              <>
                <Upload onLoaded={handleFile} />
                {file && mapping && (
                  <>
                    <MappingForm
                      key={file.loadId}
                      table={file.table}
                      source={file.mappingSource}
                      mapping={mapping}
                      sample={parsed[0]}
                      onChange={handleMapping}
                    />
                    <section className="card">
                      <h2>{t.review.heading}</h2>
                      {!selection && <p className="muted">{t.review.chooseAccount}</p>}
                      {selection && range && existing === null && duplicateError === null && <p className="muted">{t.review.checking}</p>}
                      {duplicateError !== null && (
                        <p className="error">
                          {t.review.duplicateCheckFailed(apiErrorText(t, duplicateError))}{' '}
                          <button type="button" className="link" onClick={() => setReloadKey((k) => k + 1)}>{t.review.retry}</button>
                        </p>
                      )}
                      <label className="reference">
                        {t.review.reference}
                        <input value={effectiveReference} onChange={(e) => setReference(e.target.value)} />
                      </label>
                      <Preview rows={rows} onToggle={toggle} onFlip={flip} />
                      <div className="actions">
                        <button type="button" className="primary" disabled={!canImport} onClick={handleImport}>
                          {importing ? t.review.importing : t.review.importButton(selected.length)}
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
