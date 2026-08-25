export type NotificationsAxisId = 'priorites' | 'echeances' | 'calendrier' | 'classes' | 'activite' | 'ignores';

const INITIAL_AXIS_KEY = 'notifications_initial_axis_v1';
const VALID_AXES = new Set<NotificationsAxisId>([
    'priorites',
    'echeances',
    'calendrier',
    'classes',
    'activite',
    'ignores',
]);

/** Consomme une seule fois la destination demandée par une navigation interne. */
export const consumeNotificationsAxis = (): NotificationsAxisId | null => {
    try {
        const axis = sessionStorage.getItem(INITIAL_AXIS_KEY);
        sessionStorage.removeItem(INITIAL_AXIS_KEY);
        return axis && VALID_AXES.has(axis as NotificationsAxisId)
            ? axis as NotificationsAxisId
            : null;
    } catch {
        return null;
    }
};
