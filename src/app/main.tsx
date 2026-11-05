import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { createStableFetch } from '../platform/stableFetch';

// `index.html` capture le fetch natif avant tout module et mémorise les
// wrappers posés très tôt (extension, aperçu embarqué). On installe ici le
// pipeline résilient : un wrapper qui échoue dans son propre code est remplacé
// par le fetch natif au lieu de couper toutes les requêtes (voir `stableFetch`).
declare global {
  interface Window {
    __cdtFetchState?: { native?: typeof fetch; take: () => typeof fetch | null };
  }
}
try {
  const state = window.__cdtFetchState;
  const current = typeof window.fetch === 'function' ? window.fetch.bind(window) : window.fetch;
  const nativeFetch = state?.native ?? current;
  const stable = createStableFetch(nativeFetch);
  const early = state?.take();
  if (early) stable.adopt(early);
  Object.defineProperty(window, 'fetch', {
    get: () => stable.fetch,
    set: value => stable.adopt(value),
    configurable: true,
    enumerable: true
  });
} catch {
  /* environment protected */
}

import App from './App';
import { AuthProvider } from '../contexts/AuthContext';
import { SyncProvider } from '../contexts/SyncContext';
import { startAppUpdateChecks } from '../platform/appUpdates';
import { initAppViewport } from '../platform/appViewport';
import { initNativeRuntime } from '../platform/nativeRuntime';
import { initPwaInstall } from '../platform/pwaInstall';
import { initWebVitals } from '../platform/webVitals';
import { requestPersistentStorage } from '../infrastructure/storage/safeStorage';
import '../styles/index.css';

// Un onglet reste ouvert pendant un deploiement peut demander un fragment
// JavaScript dont le hachage n'existe plus. Sans service worker, Vite signale
// l'echec par cet evenement : on recharge une seule fois pour reprendre le
// nouveau manifeste, sans boucle si le reseau reste injoignable.
const preloadReloadKey = 'cdt_preload_reload';
window.addEventListener('vite:preloadError', event => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem(preloadReloadKey)) return;
    sessionStorage.setItem(preloadReloadKey, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});
window.addEventListener('load', () => {
  try { sessionStorage.removeItem(preloadReloadKey); } catch { /* stockage indisponible */ }
}, { once: true });

initAppViewport();
const disposePwaInstall = initPwaInstall();
const updateVisibility = () => { document.documentElement.dataset.appVisible = String(document.visibilityState === 'visible'); };
updateVisibility();
document.addEventListener('visibilitychange', updateVisibility);
const onServiceWorkerMessage = (event: MessageEvent) => {
  if (event.data?.type === 'NOTIFICATION_CLICK' && typeof event.data.url === 'string' && event.data.url.startsWith('/')) {
    window.location.hash = event.data.url.replace(/^\/#?/, '#');
  }
};
navigator.serviceWorker?.addEventListener?.('message', onServiceWorkerMessage);
import.meta.hot?.dispose(() => {
  document.removeEventListener('visibilitychange', updateVisibility);
  navigator.serviceWorker?.removeEventListener?.('message', onServiceWorkerMessage);
  disposePwaInstall();
});
void initNativeRuntime().catch(error => console.warn('Native initialization failed', error));
// Protège les cahiers locaux contre l'éviction automatique du navigateur.
void requestPersistentStorage().catch(() => {});
startAppUpdateChecks();
// Mesures terrain (LCP/CLS/INP/TTFB) : l'observation reste locale et ne coûte
// rien tant qu'aucun point de collecte n'est configuré.
const disposeVitals = initWebVitals();
import.meta.hot?.dispose(() => disposeVitals());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SyncProvider>
        <MotionConfig reducedMotion="user"><App /></MotionConfig>
      </SyncProvider>
    </AuthProvider>
  </React.StrictMode>
);
