import { useEffect, useState } from 'react';
import { apiErrorText } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { api, isUnauthorized } from '../lib/api';
import { readPref, writePref } from '../lib/prefs';
import type { Administration, FinancialAccount } from '../lib/types';

export interface Selection {
  administrationId: string;
  accountId: string;
}

interface Props {
  onChange(selection: Selection | null): void;
  onUnauthorized(): void;
}

export function AccountPicker({ onChange, onUnauthorized }: Props) {
  const [administrations, setAdministrations] = useState<Administration[] | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[] | null>(null);
  const [administrationId, setAdministrationId] = useState(() => readPref('administration'));
  const [accountId, setAccountId] = useState(() => readPref('account'));
  const [error, setError] = useState<unknown>(null);
  const { t } = useI18n();
  const errorText = error === null ? null : apiErrorText(t, error);

  const fail = (e: unknown) => (isUnauthorized(e) ? onUnauthorized() : setError(e));

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.administrations().then((list) => {
      if (!cancelled) {
        setAdministrations(list);
        setAdministrationId((current) => (list.some((a) => a.id === current) ? current : list[0]?.id ?? ''));
      }
    }, (e) => {
      if (!cancelled) fail(e);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!administrationId || !administrations?.some((a) => a.id === administrationId)) return;
    let cancelled = false;
    setError(null);
    setAccounts(null);
    api.financialAccounts(administrationId).then((list) => {
      if (!cancelled) {
        setAccounts(list);
        setAccountId((current) => (list.some((a) => a.id === current) ? current : list[0]?.id ?? ''));
      }
    }, (e) => {
      if (!cancelled) fail(e);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administrationId, administrations]);

  const valid = !!administrationId && !!accounts?.some((a) => a.id === accountId);
  useEffect(() => {
    if (valid) {
      writePref('administration', administrationId);
      writePref('account', accountId);
    }
    onChange(valid ? { administrationId, accountId } : null);
  }, [valid, administrationId, accountId, onChange]);

  return (
    <section className="card">
      <h2>{t.account.heading}</h2>
      {errorText && <p className="error">{errorText}</p>}
      {!administrations ? (
        <p className="muted">{t.account.loadingAdministrations}</p>
      ) : administrations.length === 0 ? (
        <p className="error">{t.account.noAdministrations}</p>
      ) : (
        <div className="fields">
          <label>
            {t.account.administration}
            <select value={administrationId} onChange={(e) => setAdministrationId(e.target.value)}>
              {administrations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label>
            {t.account.financialAccount}
            {!accounts ? (
              errorText ? <span className="error">{errorText}</span> : <span className="muted">{t.account.loading}</span>
            ) : accounts.length === 0 ? (
              <span className="error">{t.account.noAccounts}</span>
            ) : (
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.identifier ? ` (${a.identifier})` : ''}{a.type === 'CreditCardAccount' ? t.account.creditCard : ''}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      )}
    </section>
  );
}
