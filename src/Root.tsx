import App from './App';
import { Footer } from './components/Footer';
import { OPERATOR } from './lib/operator';
import { pageForPath } from './lib/route';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

export function Root() {
  const page = pageForPath(window.location.pathname);
  return (
    <div className="page">
      {OPERATOR && page === 'privacy' ? <Privacy operator={OPERATOR} />
        : OPERATOR && page === 'terms' ? <Terms operator={OPERATOR} />
        : <App />}
      <Footer />
    </div>
  );
}
