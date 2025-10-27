/**
 * Structured Logging
 * Consistent logging across all functions
 */

import * as functions from 'firebase-functions';

export interface LogContext {
  userId?: string;
  conversationId?: string;
  messageId?: string;
  feature?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Log info with context
 */
export function logInfo(message: string, context?: LogContext): void {
  functions.logger.info(message, context);
}

/**
 * Log warning with context
 */
export function logWarning(message: string, context?: LogContext): void {
  functions.logger.warn(message, context);
}

/**
 * Log error with context
 */
export function logError(
  message: string,
  error: any,
  context?: LogContext
): void {
  functions.logger.error(message, {
    ...context,
    error: error.message || String(error),
    stack: error.stack,
  });
}

/**
 * Log function execution time
 */
export function logPerformance(
  functionName: string,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime;
  functions.logger.info(`${functionName} completed`, {
    ...context,
    duration,
  });
}

/**
 * Create performance timer
 */
export function startTimer(): { end: (label: string, context?: LogContext) => void } {
  const startTime = Date.now();
  return {
    end: (label: string, context?: LogContext) => {
      logPerformance(label, startTime, context);
    },
  };
}


