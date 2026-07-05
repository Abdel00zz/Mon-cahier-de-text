/**
 * Production-safe logger utility
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  error: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, ...args);
    }
    // En production, vous pourriez envoyer vers un service de logging
  },
  
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
