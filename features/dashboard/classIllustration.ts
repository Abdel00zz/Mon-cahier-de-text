import type { ClassInfo } from '@/types';
import { keepToneForClass, type KEEP_TONES } from '@/utils/keepTheme';

export interface ClassIllustrationMetadata {
    src: string;
    alt: string;
    accentColor: string;
}

/**
 * Fonds de carte artisanaux haute résolution et plein format inspirés des teintes Google Keep
 * (Sable, Menthe, Ciel, Lavande, Corail) avec lavis d'aquarelle plein cadre sans marges blanches.
 */
export const KEEP_ARTISANAL_ILLUSTRATIONS: Record<typeof KEEP_TONES[number], ClassIllustrationMetadata> = {
    sand: {
        src: '/images/illustrations/keep_sand_bleed_1789727470609.jpg',
        alt: 'Lavis d’aquarelle artisanale sable et ambre Google Keep',
        accentColor: '#c26e06',
    },
    mint: {
        src: '/images/illustrations/keep_mint_bleed_1789727484114.jpg',
        alt: 'Lavis d’aquarelle artisanale menthe et sauge Google Keep',
        accentColor: '#0d8249',
    },
    sky: {
        src: '/images/illustrations/keep_sky_bleed_1789727512014.jpg',
        alt: 'Lavis d’aquarelle artisanale azur et ciel Google Keep',
        accentColor: '#1d6be6',
    },
    lavender: {
        src: '/images/illustrations/keep_lavender_bleed_1789727526453.jpg',
        alt: 'Lavis d’aquarelle artisanale lavande et lilas Google Keep',
        accentColor: '#7c3aed',
    },
    coral: {
        src: '/images/illustrations/keep_coral_bleed_1789727546391.jpg',
        alt: 'Lavis d’aquarelle artisanale corail et pêche Google Keep',
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

