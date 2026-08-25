import React from 'react';
import ReactDOM from 'react-dom/client';

// Safeguard against third-party libraries (like Capacitor) attempting to re-assign window.fetch
// in environments (like AI Studio preview) where it is read-only (getter only).
try {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
  if (desc && nativeFetch && !desc.set && desc.configurable) {
    Object.defineProperty(window, 'fetch', {
      // `fetch` est généralement une propriété de données (`value`) et non
      // un getter. Réutiliser uniquement `desc.get` la rendait indéfinie.
      get: () => nativeFetch,
      set: function(val) {
        console.warn('Ignored attempt to re-assign window.fetch', val);
      },
      configurable: true,
      enumerable: desc.enumerable
    });
  }
} catch (e) {
  console.warn('Could not safeguard window.fetch:', e);
}

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { initPwa } from './pwa/registerSW';
import { initApplePlatform } from './utils/applePlatform';
import './index.css';

initApplePlatform();
initPwa();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </AuthProvider>
  </React.StrictMode>
);
