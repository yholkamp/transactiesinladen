import { useI18n } from '../i18n/I18nProvider';
import { OPERATOR } from '../lib/operator';

export function Footer() {
  const { t } = useI18n();
  if (!OPERATOR) return null;
  return (
    <footer className="site-footer">
      <a href={`mailto:${OPERATOR.email}`}>{t.footer.contact}</a>
    </footer>
  );
}
