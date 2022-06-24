#!/usr/bin/env node
/* eslint-disable sonarjs/cognitive-complexity */
const fs = require('node:fs/promises');
const util = require('node:util');
const process = require('node:process');
const { join } = require('node:path');
const fsExtra = require('fs-extra');
const { transports, format, createLogger } = require('winston');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios').default;
const { name: appName } = require('../package.json');

const appRootPath = process.cwd();
const appLoggerFilePath = join(appRootPath, `${appName}.log`);
const appSteamAppsRootPath = join(appRootPath, 'steamapps');

/**
 * isNumeric
 * @param txt {string}
 * */
const isNumeric = (txt) => {
  if (typeof txt !== 'string') {
    return false;
  }
  return !Number.isNaN(txt) && !Number.isNaN(Number.parseFloat(txt));
};

// LOGGER
const loggerFormatString = format.printf(({ level, timestamp, message }) => `[${timestamp}] [${level}]: ${message}`);
const loggerFormatTimestamp = 'YYYY-MM-DD hh:mm:ss.SSS';
const logger = createLogger({
  level: 'silly',
  format: format.combine(format.timestamp({ format: loggerFormatTimestamp }), loggerFormatString),
  transports: [
    new transports.File({
      filename: appLoggerFilePath,
      maxFiles: 5,
      // 5mb
      maxsize: 5_242_880,
      tailable: true,
      format: format.combine(format.timestamp({ format: loggerFormatTimestamp }), loggerFormatString),
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: loggerFormatTimestamp }),
        loggerFormatString
      ),
    }),
  ],
});

// THE BEST PART
yargs(hideBin(process.argv))
  .usage('./$0 - follow the instructions below')
  .example('./$0 --appids 601150', 'this is an example for single appId')
  .example('./$0 --appids 601150 1593500', 'this is an example for multiple appIds')
  .option('appids', {
    array: true,
    string: true,
    describe: 'You can set a single appId or multiple appIds',
    demandOption: true,
  })
  .strict()
  .parseAsync()
  .then(async (argv) => {
    const appIds = argv.appids;
    if (appIds.length > 0) {
      for (const appId of appIds) {
        if (isNumeric(appId)) {
          logger.info(`Trying to get data of ${appId}...`);

          const url = `https://api.steamcmd.net/v1/info/${appId}`;
          const response = await axios.get(url);
          const responseData = response.data;

          if (responseData.status === 'success') {
            const data = responseData.data[appId];

            const appName = data.common.name;
            const appInstallDirectory = data.config.installdir;
            const appBuildId = data.depots.branches.public.buildid;
            const appBaseLanguages = data.depots.baselanguages;
            const appInstalledDepots = [];
            const appSharedDepots = [];
            let appSize;

            logger.debug(util.format('appName', appName));
            logger.debug(util.format('appInstallDirectory', appInstallDirectory));
            logger.debug(util.format('appBuildId', appBuildId));
            logger.debug(util.format('appBaseLanguages', appBaseLanguages));

            const dataDepots = data.depots;
            for (const depotId in dataDepots) {
              if (Object.hasOwn(dataDepots, depotId)) {
                if (isNumeric(depotId)) {
                  const depotData = dataDepots[depotId];
                  const depotName = depotData.name;
                  const depotSize = depotData.maxsize;
                  const depotManifestId =
                    typeof depotData.manifests !== 'undefined' && typeof depotData.manifests.public !== 'undefined'
                      ? depotData.manifests.public
                      : undefined;

                  logger.debug(`-------------------------- DEPOTID ${depotId}`);
                  logger.debug(util.format('depotName', depotName));
                  logger.debug(util.format('depotSize', depotSize));
                  logger.debug(util.format('depotManifestId', depotManifestId));

                  if (typeof depotManifestId !== 'undefined') {
                    const depotOs =
                      typeof depotData.config !== 'undefined' && typeof depotData.config.oslist !== 'undefined'
                        ? depotData.config.oslist
                        : undefined;
                    const depotIsDlc = typeof depotData.dlcappid !== 'undefined' ? depotData.dlcappid : undefined;
                    const depotIsSharedInstall =
                      typeof depotData.sharedinstall !== 'undefined' ? depotData.depotfromapp : undefined;

                    logger.debug(util.format('depotOs', depotOs));
                    logger.debug(util.format('depotIsDlc', depotIsDlc));
                    logger.debug(util.format('depotIsSharedInstall', depotIsSharedInstall));

                    // ONLY WINDOWS
                    if (typeof depotOs === 'undefined' || depotOs === 'windows') {
                      if (typeof depotIsSharedInstall !== 'undefined') {
                        appSharedDepots.push(`"${depotId}"  "${depotIsSharedInstall}"`);
                        // NOTE: i noticed that it is always the first depot that contains the game size but I have to skip the sharedinstalls
                      } else if (typeof appSize === 'undefined') {
                        appSize = depotSize;
                        logger.debug(util.format('appSize', appSize, '(it is normal if it is displayed after!)'));
                      }

                      appInstalledDepots.push(`"${depotId}"
    {
      "manifest"  "${depotManifestId}"
      "size"      "${depotSize}"
      ${typeof depotIsDlc !== 'undefined' ? `"dlcappid"  "${depotIsDlc}"` : ''}
    }`);
                    } else {
                      logger.info(`${depotId} it is not a valid depot for Windows OS.`);
                    }
                  } else {
                    logger.info(`${depotId} it is an unused depot.`);
                  }
                } else {
                  logger.info(`${depotId} SKIP...`);
                }
              }
            }

            const appManifestAppIdFilePath = join(appSteamAppsRootPath, `appmanifest_${appId}.acf`);
            await fsExtra.ensureDir(appSteamAppsRootPath);
            await fs.writeFile(
              appManifestAppIdFilePath,
              `"AppState"
{
  "appid"                             "${appId}"
  "Universe"                          "1"
  "LauncherPath"                      ""
  "name"                              "${appName}"
  "StateFlags"                        "4"
  "installdir"                        "${appInstallDirectory}"
  "LastUpdated"                       "0"
  "SizeOnDisk"                        "${appSize}"
  "StagingSize"                       "0"
  "buildid"                           "${appBuildId}"
  "LastOwner"                         "2009"
  "UpdateResult"                      "0"
  "BytesToDownload"                   "0"
  "BytesDownloaded"                   "0"
  "BytesToStage"                      "0"
  "BytesStaged"                       "0"
  "TargetBuildID"                     "0"
  "AutoUpdateBehavior"                "0"
  "AllowOtherDownloadsWhileRunning"   "0"
  "ScheduledAutoUpdate"               "0"
  ${
    typeof appBaseLanguages !== 'undefined'
      ? `
  "UserConfig"
  {
    "language"  "${appBaseLanguages}"
  }`
      : ''
  }
  ${
    appInstalledDepots.length > 0
      ? `
  "InstalledDepots"
  {
    ${appInstalledDepots.join('\n    ')}
  }`
      : ''
  }
  ${
    appSharedDepots.length > 0
      ? `
  "SharedDepots"
  {
    ${appSharedDepots.join('\n    ')}
  }`
      : ''
  }
}`
            );
            logger.info(`${appManifestAppIdFilePath} was written successfully!`);
          } else {
            logger.error(`Response from API: ${responseData.data}`);
          }
        } else {
          logger.error(`The appId "${appId}" is invalid!`);
        }
      }
    } else {
      throw new Error('You have not entered any appid!');
    }
  })
  .catch((error) => logger.error(error));
