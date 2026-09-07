import { createContext } from 'react';

/** Rendering is safe only once the CDN runtime has resolved successfully. */
export const MathRuntimeContext = createContext(false);
