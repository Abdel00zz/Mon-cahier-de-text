import { useMediaQuery } from './useMediaQuery';

const MOBILE_QUERY = '(max-width: 767px)';

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
