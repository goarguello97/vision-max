/**
 * @fileoverview Sistema de logging para la aplicación
 * @module utils/logger
 */

/**
 * Niveles de logging disponibles.
 * @typedef {'info' | 'warn' | 'error' | 'debug'} LogLevel
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Estructura de una entrada de log.
 * @interface LogEntry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Clase Logger para manejar logs de la aplicación.
 * @class Logger
 */
class Logger {
  /**
   * Formatea una entrada de log en JSON.
   * @private
   * @method formatEntry
   */
  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    return JSON.stringify(entry);
  }

  /**
   * Registra un mensaje de información.
   * @method info
   */
  info(message: string, context?: Record<string, unknown>): void {
    console.log(this.formatEntry('info', message, context));
  }

  /**
   * Registra un mensaje de advertencia.
   * @method warn
   */
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatEntry('warn', message, context));
  }

  /**
   * Registra un mensaje de error.
   * @method error
   */
  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.formatEntry('error', message, context));
  }

  /**
   * Registra un mensaje de debug (solo en desarrollo).
   * @method debug
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatEntry('debug', message, context));
    }
  }
}

/** Instancia global del logger */
export const logger = new Logger();