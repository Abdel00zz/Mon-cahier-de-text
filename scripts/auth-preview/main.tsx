/** Development-only visual fixture; real forms, no account submissions. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { AuthPage } from '../../src/features/auth/AuthPage';
import { LocaleProvider } from '../../src/i18n/LocaleProvider';

const params = new URLSearchParams(location.search);
const initialLocale = params.get('lang') === 'ar' ? 'ar' : 'fr';
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark');

function Preview() {
  const [locale, setLocale] = useState<'ar' | 'fr'>(initialLocale);
  return <LocaleProvider locale={locale}><AuthProvider>
    <div onSubmitCapture={event => { event.preventDefault(); event.stopPropagation(); }}>
      <AuthPage locale={locale} onLocaleChange={setLocale} />
    </div>
  </AuthProvider></LocaleProvider>;
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Preview />);
  import.meta.hot?.dispose(() => root.unmount());
}
