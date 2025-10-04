/**
 * Error Logger Utility
 * Provides comprehensive error logging and tracking
 */

export interface ErrorLogEntry {
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  /**
   * Log an error
   */
  logError(error: Error | string, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.addLog(entry);
    console.error('[Error]', entry);

    // In production, you could send this to a logging service like Sentry
    if (import.meta.env.PROD) {
      this.sendToLoggingService(entry);
    }
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'warning',
      message,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.addLog(entry);
    console.warn('[Warning]', entry);
  }

  /**
   * Log info
   */
  logInfo(message: string, context?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'info',
      message,
      context,
      url: window.location.href,
    };

    this.addLog(entry);
    console.info('[Info]', entry);
  }

  /**
   * Add log entry and manage max logs
   */
  private addLog(entry: ErrorLogEntry): void {
    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Send error to logging service (placeholder)
   * In production, integrate with services like Sentry, LogRocket, etc.
   */
  private sendToLoggingService(entry: ErrorLogEntry): void {
    // Placeholder for external logging service integration
    // Example: Sentry.captureException(entry)
    if (import.meta.env.MODE === 'development') {
      console.log('[Dev] Would send to logging service:', entry);
    }
  }

  /**
   * Get browser and environment info
   */
  getBrowserInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Setup global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    errorLogger.logError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.logError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      { type: 'unhandled-promise-rejection' }
    );
  });
}
