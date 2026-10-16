import { useI18n } from '../i18n/I18nProvider';
import { OPERATOR } from '../lib/operator';

const REPO_URL = 'https://github.com/yholkamp/transactiesinladen';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      {OPERATOR && <a href={`mailto:${OPERATOR.email}`}>{t.footer.contact}</a>}
      <span>
        {t.footer.openSource}{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">{t.footer.source}</a>
      </span>
    </footer>
  );
}
