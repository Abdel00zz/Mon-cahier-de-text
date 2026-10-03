/** Stable workspace identities; a contact number is never an ownership key. */
export const isAccountId = (value: unknown): value is string =>
  typeof value === 'string' && /^(?:\d{8,15}|acct_[a-f0-9]{32})$/.test(value);

export const accountOwner = (user: { id?: string; phone: string }): string => user.id ?? user.phone;
