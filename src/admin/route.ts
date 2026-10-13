/*
 * ADRESSE DE L'ADMINISTRATION — un écran = une adresse (#/…).
 *
 * Sans cela, le bouton Précédent du navigateur quitte la console et un
 * rechargement ramène toujours à la liste. Avec : la fiche d'un enseignant, le
 * calendrier ou la politique ont chacun leur lien, que l'on peut garder, partager
 * avec la direction ou rouvrir après une actualisation.
 *
 * Module pur : aucune dépendance à React ni au DOM.
 */
export type AdminView =
    | { name: 'locked' }
    | { name: 'overview' }
    | { name: 'teacher'; phone: string }
    | { name: 'calendar' }
    | { name: 'timetableClock'; phone?: string }
    | { name: 'evaluationPolicy'; phone?: string }
    | { name: 'bulletin' };

const OVERVIEW: AdminView = { name: 'overview' };

/** Segments lisibles dans l'adresse ; le téléphone est encodé (un identifiant peut contenir « : »). */
const SEGMENTS = {
    teacher: 'enseignant',
    calendar: 'vacances',
    timetableClock: 'horaires',
    evaluationPolicy: 'controle-continu',
    bulletin: 'bulletin',
} as const;

const withPhone = (segment: string, phone?: string): string =>
    phone ? `#/${segment}/${encodeURIComponent(phone)}` : `#/${segment}`;

export const viewToHash = (view: AdminView): string => {
    switch (view.name) {
        case 'teacher': return withPhone(SEGMENTS.teacher, view.phone);
        case 'calendar': return `#/${SEGMENTS.calendar}`;
        case 'timetableClock': return withPhone(SEGMENTS.timetableClock, view.phone);
        case 'evaluationPolicy': return withPhone(SEGMENTS.evaluationPolicy, view.phone);
        case 'bulletin': return `#/${SEGMENTS.bulletin}`;
        default: return '#/';
    }
};

const safeDecode = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    try { return decodeURIComponent(value); } catch { return undefined; }
};

/** Écran demandé par une adresse ; toute adresse inconnue ou mal formée ramène à la liste. */
export const hashToView = (hash: string): AdminView => {
    const [segment, rawPhone] = hash.replace(/^#\/?/, '').split('/');
    const phone = safeDecode(rawPhone);
    switch (segment) {
        case SEGMENTS.teacher: return phone ? { name: 'teacher', phone } : OVERVIEW;
        case SEGMENTS.calendar: return { name: 'calendar' };
        case SEGMENTS.timetableClock: return { name: 'timetableClock', ...(phone ? { phone } : {}) };
        case SEGMENTS.evaluationPolicy: return { name: 'evaluationPolicy', ...(phone ? { phone } : {}) };
        case SEGMENTS.bulletin: return { name: 'bulletin' };
        default: return OVERVIEW;
    }
};

export const sameView = (a: AdminView, b: AdminView): boolean => viewToHash(a) === viewToHash(b) && a.name === b.name;
