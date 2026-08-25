import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { AdminApp } from './AdminApp';
import { MATHJAX_V4_SRC, mathJaxConfig } from '../config/mathJax';
import '../index.css';

// Même contexte MathJax que l'application : l'impression d'un cahier depuis
// l'admin réutilise PrintView, qui compose les formules via `better-react-mathjax`.
const MathJaxContext = lazy(() => import('better-react-mathjax').then(module => ({ default: module.MathJaxContext })));

const rootElement = document.getElementById('admin-root');
if (!rootElement) {
  throw new Error("Élément racine admin introuvable");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider locale="fr" manageDocument={false}>
      <Suspense fallback={null}>
        <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig}>
          <AdminApp />
        </MathJaxContext>
      </Suspense>
    </LocaleProvider>
  </React.StrictMode>
);
