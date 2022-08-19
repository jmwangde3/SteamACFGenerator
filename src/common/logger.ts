import path from 'node:path';
import util from 'node:util';
import * as winston from 'winston';
import appInfo from '../../package.json';
import { appLoggerRootPath } from './paths';

const loggerFilePath = path.join(appLoggerRootPath, `${appInfo.name}.log`);
const loggerFormat = winston.format.printf(
  ({ level, timestamp, message }) => `[${timestamp as string}] [${level}]: ${message as string}`
);
const loggerFormatTimestamp = winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS' });
const loggerInstance = winston.createLogger({
  level: 'silly',
  transports: [
    new winston.transports.File({
      filename: loggerFilePath,
      maxFiles: 5,
      maxsize: 5_242_880,
      tailable: true,
      format: winston.format.combine(loggerFormatTimestamp, loggerFormat),
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), loggerFormatTimestamp, loggerFormat),
    }),
  ],
});

const logger = {
  info: (...data: unknown[]) => loggerInstance.info(util.format(...data)),
  debug: (...data: unknown[]) => loggerInstance.debug(util.format(...data)),
  error: (...data: unknown[]) => loggerInstance.debug(util.format(...data)),
};

export default logger;
