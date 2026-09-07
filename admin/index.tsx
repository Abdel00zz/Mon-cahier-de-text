import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { AdminApp } from './AdminApp';
import { MathProvider } from '../components/ui/math-provider';
import '../index.css';

// Même contexte MathJax que l'application : l'impression d'un cahier depuis
// l'admin réutilise PrintView, qui compose les formules via `better-react-mathjax`.

const rootElement = document.getElementById('admin-root');
if (!rootElement) {
  throw new Error("Élément racine admin introuvable");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider locale="fr" manageDocument={false}>
      <Suspense fallback={null}>
        <MathProvider>
          <AdminApp />
        </MathProvider>
      </Suspense>
    </LocaleProvider>
  </React.StrictMode>
);
