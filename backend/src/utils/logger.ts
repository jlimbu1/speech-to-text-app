import { createLogger, format, transports, Logger } from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, json, colorize, errors } = format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

const logger: Logger = createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    new transports.Console({
      format: config.nodeEnv === 'production'
        ? combine(json())
        : combine(colorize(), devFormat),
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(json()),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new transports.File({
      filename: 'logs/combined.log',
      format: combine(json()),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

export { logger };