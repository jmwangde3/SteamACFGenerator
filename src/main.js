#!/usr/bin/env node
const util = require('node:util');
const process = require('node:process');
const path = require('node:path');
const fsExtra = require('fs-extra');
const yargs = require('yargs/yargs');
const yargsHelpers = require('yargs/helpers');
const vdf = require('vdf-parser');
const appInfo = require('../package.json');
const logger = require('./logger.js');
const isNumeric = require('./is-numeric.js');
const steamCMDGetData = require('./steamcmd.js');

yargs(yargsHelpers.hideBin(process.argv))
  .usage(`./$0 - v${appInfo.version} - follow the instructions below`)
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
  // eslint-disable-next-line sonarjs/cognitive-complexity
  .then(async (argv) => {
    const appIds = argv.appids;
    if (appIds.length > 0) {
      for (const appId of appIds) {
        if (isNumeric(appId)) {
          logger.info(`Trying to get data of ${appId}...`);
          /**
           * @type Record<string, any> | string
           */
          const steamCMDData = await steamCMDGetData(appId);
          if (typeof steamCMDData !== 'string') {
            const data = steamCMDData[appId];

            const appName = data.common.name;
            const appInstallDirectory = data.config.installdir;
            const appBuildId = data.depots.branches.public.buildid;
            const appBaseLanguages = data.depots.baselanguages;
            /**
             * @type Record<string, any>
             */
            const appInstalledDepots = {};
            /**
             * @type Record<string, any>
             */
            const appSharedDepots = {};
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
                        appSharedDepots[depotId] = depotIsSharedInstall;
                        // NOTE: i noticed that it is always the first depot that contains the game size but I have to skip the sharedinstalls
                      } else if (typeof appSize === 'undefined') {
                        appSize = depotSize;
                        logger.debug(util.format('appSize', appSize, '(it is normal if it is displayed after!)'));
                      }

                      appInstalledDepots[depotId] =
                        typeof depotIsDlc !== 'undefined'
                          ? {
                              manifest: depotManifestId,
                              size: depotSize,
                              dlcappid: depotIsDlc,
                            }
                          : {
                              manifest: depotManifestId,
                              size: depotSize,
                            };
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

            const appSteamAppsRootPath = path.join(process.cwd(), 'steamapps');
            const appManifestAppIdFilePath = path.join(appSteamAppsRootPath, `appmanifest_${appId}.acf`);
            await fsExtra.ensureDir(appSteamAppsRootPath);

            /**
             * @type Record<string, any>
             */
            const appVdf = {
              AppState: {
                appid: appId,
                Universe: 1,
                LauncherPath: '',
                name: appName,
                StateFlags: 4,
                installdir: appInstallDirectory,
                LastUpdated: 0,
                SizeOnDisk: appSize,
                StagingSize: 0,
                buildid: appBuildId,
                LastOwner: 2009,
                UpdateResult: 0,
                BytesToDownload: 0,
                BytesDownloaded: 0,
                BytesToStage: 0,
                BytesStaged: 0,
                TargetBuildID: 0,
                AutoUpdateBehavior: 0,
                AllowOtherDownloadsWhileRunning: 0,
                ScheduledAutoUpdate: 0,
                UserConfig: {},
                InstalledDepots: {},
                SharedDepots: {},
              },
            };

            if (typeof appBaseLanguages !== 'undefined') {
              appVdf.AppState.UserConfig.language = appBaseLanguages;
            }

            if (Object.keys(appInstalledDepots).length > 0) {
              appVdf.AppState.InstalledDepots = appInstalledDepots;
            }

            if (Object.keys(appSharedDepots).length > 0) {
              appVdf.AppState.SharedDepots = appSharedDepots;
            }

            await fsExtra.writeFile(appManifestAppIdFilePath, vdf.stringify(appVdf, { pretty: true, indent: '  ' }));
            logger.info(`${appManifestAppIdFilePath} was written successfully!`);
          } else {
            logger.error(`Unknown error from SteamCMD!`);
            logger.error(steamCMDData);
          }
        } else {
          logger.error(`The appId "${appId}" is invalid!`);
        }
      }
    } else {
      throw new Error('You have not entered any appid!');
    }
  })
  .catch((error) => logger.error(util.format(error)));
