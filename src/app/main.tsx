import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';

// Safeguard against third-party libraries (like Capacitor) and extensions attempting to re-assign window.fetch
// in environments (like AI Studio preview) where it is read-only (getter only).
try {
  let activeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : window.fetch;
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (!desc || !desc.set || desc.writable === false) {
    Object.defineProperty(window, 'fetch', {
      get: () => activeFetch,
      set: function(val) {
        if (typeof val === 'function') activeFetch = val;
      },
      configurable: true,
      enumerable: true
    });
  }
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
void import('../infrastructure/storage/safeStorage').then(module => module.requestPersistentStorage()).catch(() => {});
startAppUpdateChecks();

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
