const path = require('node:path');
const process = require('node:process');
const winston = require('winston');
const appInfo = require('../package.json');

const loggerFilePath = path.join(process.cwd(), `${appInfo.name}.log`);
const loggerFormatString = winston.format.printf(
  ({ level, timestamp, message }) => `[${timestamp}] [${level}]: ${message}`
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

module.exports = logger;
