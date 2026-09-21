import type { ClassIdentity } from './classIdentity';
import { keepToneForClass, type KEEP_TONES } from './keepTheme';

type ClassTone = typeof KEEP_TONES[number];

const BRANCH_TONES: Readonly<Record<string, ClassTone>> = {
  PC: 'coral', SVT: 'lime', SM: 'indigo', 'SM-A': 'indigo', 'SM-B': 'lavender',
  SEXP: 'mint', SECO: 'sand', SEG: 'sand', SGC: 'sand',
  L: 'lavender', LSH: 'lavender', SH: 'rose', SI: 'sky',
  'TC-S': 'sky', 'TC-L': 'lavender', 'TC-T': 'coral',
  MPSI: 'indigo', MP: 'indigo', PCSI: 'coral', PSI: 'coral', TSI: 'sky', ECS: 'sand', ECT: 'sand',
};

/** Same branch, same palette in both languages and across all group numbers. */
export const classBranchToneFor = (identity: ClassIdentity): ClassTone =>
  (identity.streamCode ? BRANCH_TONES[identity.streamCode] : undefined)
    ?? keepToneForClass(identity.streamCode || identity.tierKey || identity.full);
