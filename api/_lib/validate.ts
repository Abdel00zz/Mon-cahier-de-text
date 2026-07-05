import { HttpError } from './http';

const MAX_BODY_BYTES = 950_000; // marge sous la limite ~1 MB des requêtes Upstash

export const normalizePhone = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Numéro de téléphone manquant.');
  }
  const digits = value.replace(/[^\d]/g, '').replace(/^00/, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new HttpError(400, 'Numéro de téléphone invalide (8 à 15 chiffres attendus).');
  }
  return digits;
};

export const assertName = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new HttpError(400, `${label} manquant.`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 60) {
    throw new HttpError(400, `${label} invalide (1 à 60 caractères).`);
  }
  return trimmed;
};

export const assertPassword = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (value.length > 128) {
    throw new HttpError(400, 'Mot de passe trop long (128 caractères max).');
  }
  return value;
};

export const assertBodySize = (body: unknown): void => {
  const size = typeof body === 'string'
    ? Buffer.byteLength(body, 'utf8')
    : Buffer.byteLength(JSON.stringify(body ?? {}), 'utf8');
  if (size > MAX_BODY_BYTES) {
    throw new HttpError(413, 'Données trop volumineuses pour la synchronisation (limite ~950 Ko par requête).');
  }
};
