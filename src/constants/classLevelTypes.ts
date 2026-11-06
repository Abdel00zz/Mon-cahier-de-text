export type ClassLevelGroupKey = 'college' | 'common' | 'firstBac' | 'secondBac' | 'prepa' | 'prepaFirst' | 'prepaSecond';

export interface ClassLevelGroup {
  key: ClassLevelGroupKey;
  levels: string[];
}

export type ClassTierKey =
  | 'college1' | 'college2' | 'college3'
  | 'common' | 'firstBac' | 'secondBac'
  | 'prepa' | 'prepa1' | 'prepa2';

export interface ClassLevelIdentity {
  tier: ClassTierKey;
  /** Code de filière, vide pour les niveaux qui n'en portent pas (collège). */
  stream: string;
}
