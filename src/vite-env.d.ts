/// <reference types="vite/client" />

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/** Version compilée, comparée à `/version.json` pour proposer une mise à jour. */
declare const __APP_VERSION__: string;
