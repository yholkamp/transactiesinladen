import { oauthErrorText } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { OPERATOR } from '../lib/operator';

export function Connect({ error }: { error: string | null }) {
  const { t } = useI18n();
  return (
    <section className="card connect">
      <h2>{t.connect.heading}</h2>
      <p>{t.connect.intro}</p>
      {error && <p className="error">{t.connect.failed(oauthErrorText(t, error))}</p>}
      <a className="button primary" href="/api/auth/login">{t.connect.button}</a>
      {OPERATOR && (
        <p className="muted consent">
          {t.connect.consent.before}
          <a href="/voorwaarden">{t.connect.consent.terms}</a>
          {t.connect.consent.and}
          <a href="/privacy">{t.connect.consent.privacy}</a>
          {t.connect.consent.after}
        </p>
      )}
    </section>
  );
}
