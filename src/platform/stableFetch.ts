/*
 * Certains aperçus embarqués, extensions et SDK instrumentent `window.fetch`.
 * Quand ce wrapper échoue dans SON propre code (par exemple
 * `undefined.M_ID`), toutes les requêtes de l'application tombent alors que le
 * fetch natif fonctionne encore. On garde donc l'implémentation native sous la
 * main et on ne retente qu'une fois, en natif, quand l'échec vient du wrapper.
 */
export type AdoptableFetch = typeof fetch;

export interface StableFetch {
  /** Fonction exposée comme `window.fetch` : wrapper adopté, repli natif. */
  fetch: AdoptableFetch;
  /** Adopte un wrapper tiers ; le natif reste le filet de sécurité. */
  adopt(next: unknown): void;
}

const NETWORK_FAILURE = /failed to fetch|networkerror|network error|load failed|aborted|abort/i;

/**
 * Une TypeError levée par le code du wrapper (« undefined.M_ID ») n'est pas une
 * panne réseau : la requête n'a jamais atteint le serveur et peut être rejouée.
 */
export function isWrapperFailure(error: unknown): boolean {
  return error instanceof TypeError && !NETWORK_FAILURE.test(error.message);
}

const methodOf = (input: RequestInfo | URL, init?: RequestInit): string => {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
};

export function createStableFetch(nativeFetch: AdoptableFetch): StableFetch {
  let adopted: AdoptableFetch | null = null;

  const stable = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!adopted || adopted === nativeFetch) return nativeFetch(input, init);
    try {
      return await adopted(input, init);
    } catch (error) {
      const idempotent = methodOf(input, init).match(/^(GET|HEAD)$/) !== null;
      // Une écriture n'est rejouée que si le wrapper a échoué avant le réseau.
      if (!idempotent && !isWrapperFailure(error)) throw error;
      // Le wrapper est abandonné pour le reste de la session : une seule
      // reprise native, jamais deux appels réseau pour une même écriture.
      adopted = null;
      return nativeFetch(input, init);
    }
  }) as AdoptableFetch;

  return {
    fetch: stable,
    adopt(next) {
      if (typeof next === 'function' && next !== stable) adopted = next as AdoptableFetch;
    },
  };
}
