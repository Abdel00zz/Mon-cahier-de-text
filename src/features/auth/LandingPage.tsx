import { useState } from 'react';
import type { AppLocale } from '@/types';
import { RegistrationOnboarding } from './RegistrationOnboarding';
import type { RegistrationDraft, RegistrationSetup } from './registrationSetup';
import './landing.css';

const EMPTY_DRAFT: RegistrationDraft = { cycle: '', levelGroup: '', level: '', subject: '', group: '1' };

/** The first class is prepared directly on the landing screen; no account is created yet. */
export function LandingPage({ locale, onLogin, onRegister, draft, onDraftChange }: {
  locale: AppLocale;
  onLogin: () => void;
  onRegister: (setup: RegistrationSetup) => void;
  draft?: RegistrationDraft;
  onDraftChange?: (draft: RegistrationDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState(EMPTY_DRAFT);
  return <RegistrationOnboarding locale={locale === 'ar' ? 'ar' : 'fr'}
    draft={draft ?? localDraft} onChange={onDraftChange ?? setLocalDraft}
    onComplete={onRegister} onLogin={onLogin} />;
}
