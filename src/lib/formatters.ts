import type { AppLocale } from '../types.js';

/**
 * Formateurs `Intl` mémoïsés.
 *
 * Construire un `Intl.DateTimeFormat` ou `Intl.NumberFormat` coûte cher : la
 * locale doit être résolue et ses données chargées. Appelé « en ligne » dans
 * une boucle de rendu, il en crée une instance par ligne ET par rendu — c'était
 * le cas des tableaux de séances (une centaine de lignes par cahier) et du fil
 * d'activité. On partage donc une instance par couple (locale, options) : le
 * coût est payé une fois, l'appel devient un simple `format`.
 *
 * Les options étant sérialisées en clé de cache, les utiliser avec des objets
 * littéraux stables (constantes de module) et non recréés à chaque rendu.
 */

const localeCode = (locale: AppLocale): string =>
    locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';

const dateTimeCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();

const cacheKey = (locale: AppLocale, options?: object): string =>
    `${locale}\u0000${options ? JSON.stringify(options) : ''}`;

export const dateTimeFormat = (locale: AppLocale, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
    const key = cacheKey(locale, options);
    let formatter = dateTimeCache.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(localeCode(locale), options);
        dateTimeCache.set(key, formatter);
    }
    return formatter;
};

export const numberFormat = (locale: AppLocale, options?: Intl.NumberFormatOptions): Intl.NumberFormat => {
    const key = cacheKey(locale, options);
    let formatter = numberCache.get(key);
    if (!formatter) {
        formatter = new Intl.NumberFormat(localeCode(locale), options);
        numberCache.set(key, formatter);
    }
    return formatter;
};
