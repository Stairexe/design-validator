export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type LogSink = (line: string) => void;

/**
 * Minimal structured (JSON lines) logger. Bindings such as `queue`, `jobId`
 * and `auditId` are attached to every line so logs can be correlated.
 */
export function createLogger(
  bindings: LogFields = {},
  options: { level?: LogLevel; sink?: LogSink } = {},
): Logger {
  const minLevel = LEVEL_ORDER[options.level ?? 'info'];
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`));

  const write = (level: LogLevel, message: string, fields?: LogFields) => {
    if (LEVEL_ORDER[level] < minLevel) {
      return;
    }
    sink(
      JSON.stringify({ time: new Date().toISOString(), level, message, ...bindings, ...fields }),
    );
  };

  return {
    debug: (message, fields) => {
      write('debug', message, fields);
    },
    info: (message, fields) => {
      write('info', message, fields);
    },
    warn: (message, fields) => {
      write('warn', message, fields);
    },
    error: (message, fields) => {
      write('error', message, fields);
    },
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }, options),
  };
}
