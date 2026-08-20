import { useEffect } from 'react';
import { logger } from '../utils/logger';

export const useForceLandscape = () => {
    useEffect(() => {
        const lockOrientation = async () => {
            if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
                try {
                    // @ts-ignore - TS doesn't fully support all lock types
                    await screen.orientation.lock('landscape');
                    logger.info('Successfully locked screen orientation to landscape');
                } catch (error) {
                    // This often fails due to missing Fullscreen API requirements or browser support
                    logger.warn('Failed to lock screen orientation (often requires fullscreen on mobile):', error);
                }
            }
        };

        lockOrientation();

        return () => {
            if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
                try {
                    screen.orientation.unlock();
                    logger.info('Unlocked screen orientation');
                } catch (error) {
                    logger.warn('Failed to unlock screen orientation:', error);
                }
            }
        };
    }, []);
};
