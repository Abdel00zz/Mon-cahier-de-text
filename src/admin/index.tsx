import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { AdminApp } from './AdminApp';
import '../styles/index.css';

const rootElement = document.getElementById('admin-root');
if (!rootElement) {
  throw new Error("Élément racine admin introuvable");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LocaleProvider locale="fr" manageDocument={false}>
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    </LocaleProvider>
  </React.StrictMode>
);
