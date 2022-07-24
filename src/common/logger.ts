import path from 'node:path';
import util from 'node:util';
import * as winston from 'winston';
import appInfo from '../../package.json';
import { appLoggerRootPath } from './paths';

const loggerFilePath = path.join(appLoggerRootPath, `${appInfo.name}.log`);
const loggerFormatString = winston.format.printf(
  ({ level, timestamp, message }) => `[${timestamp as string}] [${level}]: ${message as string}`
);
const loggerFormatTimestamp = 'YYYY-MM-DD hh:mm:ss.SSS';
const logger = winston.createLogger({
  level: 'silly',
  format: winston.format.combine(winston.format.timestamp({ format: loggerFormatTimestamp }), loggerFormatString),
  transports: [
    new winston.transports.File({
      filename: loggerFilePath,
      maxFiles: 5,
      maxsize: 5_242_880,
      tailable: true,
      format: winston.format.combine(winston.format.timestamp({ format: loggerFormatTimestamp }), loggerFormatString),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: loggerFormatTimestamp }),
        loggerFormatString
      ),
    }),
  ],
});

const c = {
  info: (...data: unknown[]) => logger.info(util.format(...data)),
  debug: (...data: unknown[]) => logger.debug(util.format(...data)),
  error: (...data: unknown[]) => logger.debug(util.format(...data)),
};

export default c;
