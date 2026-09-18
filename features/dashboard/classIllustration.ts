import type { ClassInfo } from '@/types';
import { keepToneForClass, type KEEP_TONES } from '@/utils/keepTheme';

export interface ClassIllustrationMetadata {
    src: string;
    alt: string;
    accentColor: string;
}

/**
 * Fonds de carte artistiques haute résolution inspirés de l'univers onirique et poétique
 * (nuages bienveillants, rayons solaires rayonnants, dégradés ciel azur, aube dorée, menthe, lavande et corail)
 * harmonisés avec les teintes du tableau de bord et de la barre latérale.
 */
export const KEEP_ARTISANAL_ILLUSTRATIONS: Record<typeof KEEP_TONES[number], ClassIllustrationMetadata> = {
    sand: {
        src: '/images/illustrations/whimsical_sand_clouds_1789728397038.jpg',
        alt: 'Illustration poétique ciel ambre doré, aurore et nuages bienveillants',
        accentColor: '#c25e2e',
    },
    mint: {
        src: '/images/illustrations/whimsical_mint_clouds_1789728408468.jpg',
        alt: 'Illustration poétique ciel menthe céladon et nuages flottants',
        accentColor: '#0d8249',
    },
    sky: {
        src: '/images/illustrations/whimsical_sky_clouds_1789728385377.jpg',
        alt: 'Illustration poétique ciel azur, soleil rayonnant et nuages souriants',
        accentColor: '#2563eb',
    },
    lavender: {
        src: '/images/illustrations/whimsical_lavender_clouds_1789728420491.jpg',
        alt: 'Illustration poétique crépuscule lavande lilas et nuages poétiques',
        accentColor: '#7c3aed',
    },
    coral: {
        src: '/images/illustrations/whimsical_coral_clouds_1789728433347.jpg',
        alt: 'Illustration poétique coucher de soleil corail pêche et nuages chaleureux',
        accentColor: '#d94826',
    },
};

/**
 * Associe à chaque classe son fond artisanal Google Keep selon sa teinte attribuée.
 */
export function getIllustrationForClass(classInfo: ClassInfo, index = 0): ClassIllustrationMetadata {
    const tone = keepToneForClass(classInfo.id || classInfo.name, index);
    return KEEP_ARTISANAL_ILLUSTRATIONS[tone] || KEEP_ARTISANAL_ILLUSTRATIONS.sand;
}

