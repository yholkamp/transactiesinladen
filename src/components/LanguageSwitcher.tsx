import { LANGS } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.app.language}>
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={l === lang} className={l === lang ? 'active' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
