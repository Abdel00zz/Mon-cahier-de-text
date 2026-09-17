import type { AppLocale, LessonsData } from '../types.js';
import { translateLocaleMessage } from '../i18n/LocaleProvider.js';
import { isNonCourseActivity, validChapterDate } from './chapterLifecycle.js';
import { buildLessonRows, type LessonRow } from './lessonRows.js';
import type { DateWarning } from './dateValidation.js';

/**
 * Ordre chronologique du cahier de textes.
 *
 * Un cahier se lit de haut en bas : la date d'un contenu ne peut pas reculer
 * par rapport au contenu daté qui le précède. Le contrôle croise donc chaque
 * contenu avec son plus proche voisin daté (avant et après), sans exiger la
 * contiguïté — un contenu non daté entre deux séances ne rompt pas la chaîne.
 *
 * Les activités non pédagogiques (évaluations, devoirs, corrections, soutien)
 * sont volontairement hors chaîne : un devoir annoncé le 12 pour le 20 est une
 * date cible, pas une séance, et l'inclure produirait de fausses alertes.
 */

export interface ContentDateOrder {
    /** Date du plus proche contenu daté AVANT celui-ci. */
    previous?: string;
    /** Date du plus proche contenu daté APRÈS celui-ci. */
    following?: string;
}

const isDatedCourseRow = (row: LessonRow): boolean =>
    row.elementType === 'item'
    && !isNonCourseActivity((row.data as { type?: unknown }).type)
    && validChapterDate((row.data as { date?: unknown }).date);

const rowDate = (row: LessonRow): string => (row.data as { date: string }).date;

/**
 * Construit l'ordre chronologique de tous les contenus datés, indexé par la clé
 * canonique de ligne (`indicesKey`) — la même que celle du rendu à l'écran.
 */
export const buildContentDateOrder = (lessons: LessonsData): Map<string, ContentDateOrder> => {
    const order = new Map<string, ContentDateOrder>();
    const dated: LessonRow[] = [];
    for (const row of buildLessonRows(lessons)) if (isDatedCourseRow(row)) dated.push(row);
    dated.forEach((row, position) => {
        const previous = dated[position - 1];
        const following = dated[position + 1];
        order.set(row.key, {
            previous: previous ? rowDate(previous) : undefined,
            following: following ? rowDate(following) : undefined,
        });
    });
    return order;
};

const formatters = new Map<AppLocale, Intl.DateTimeFormat>();

const formatOrderDate = (iso: string, locale: AppLocale): string => {
    let formatter = formatters.get(locale);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
        });
        formatters.set(locale, formatter);
    }
    return formatter.format(new Date(`${iso}T00:00:00Z`));
};

/**
 * Alerte non bloquante : la date saisie rompt la lecture chronologique.
 * Une seule alerte est émise, la plus proche de la saisie (« avant » d'abord,
 * c'est le cas que le professeur corrige le plus souvent).
 */
export const dateOrderWarnings = (
    date: string,
    order: ContentDateOrder | undefined,
    locale: AppLocale = 'fr',
): DateWarning[] => {
    const iso = (date || '').slice(0, 10);
    if (!order || !validChapterDate(iso)) return [];
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
    if (order.previous && iso < order.previous) {
        return [{ type: 'out-of-order', message: t('dateWarning.beforePrevious', { date: formatOrderDate(order.previous, locale) }) }];
    }
    if (order.following && iso > order.following) {
        return [{ type: 'out-of-order', message: t('dateWarning.afterFollowing', { date: formatOrderDate(order.following, locale) }) }];
    }
    return [];
};
