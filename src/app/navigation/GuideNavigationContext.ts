import { createContext } from 'react';
import type { GuideReference } from '@/constants/guide/model';

/** Mobile contextual help opens the same page as the navigation bar. */
export const GuideNavigationContext = createContext<((reference?: GuideReference) => void) | null>(null);
