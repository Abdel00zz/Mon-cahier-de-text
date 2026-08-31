import { HttpError } from './http.js';

/** Additional identity binding, not authentication: the session remains authoritative. */
export const assertWorkspaceOwner = (claimedOwner: unknown, sessionPhone: string): void => {
  if (claimedOwner !== sessionPhone) {
    throw new HttpError(409, 'Le compte actif a changé. Rechargez la page avant de synchroniser.');
  }
};
