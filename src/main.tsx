import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import { I18nProvider } from './i18n/I18nProvider';
import { ANALYTICS, loadAnalytics } from './lib/analytics';
import './styles.css';

loadAnalytics(ANALYTICS);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </StrictMode>,
);
