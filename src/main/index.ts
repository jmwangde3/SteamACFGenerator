/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import util from 'node:util';
import process from 'node:process';
import path from 'node:path';
import fsExtra from 'fs-extra';
import yargs from 'yargs/yargs';
import yargsHelpers from 'yargs/helpers';
import vdf from 'vdf-parser';
import logger from '../common/logger';
import appInfo from '../../package.json';
import { appSteamAppsRootPath } from '../common/paths';
import isNumeric from './is-numeric';
import SteamCMD from './steamcmd';

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
  .version(appInfo.version)
  .strict()
  .parseAsync()
  // eslint-disable-next-line sonarjs/cognitive-complexity
  .then(async (argv) => {
    const appIds = argv.appids;
    if (appIds.length > 0) {
      for (const appId of appIds) {
        if (isNumeric(appId)) {
          logger.info(`Trying to get data of ${appId}... DO NOT PANIC IF IT LOOKS STUCK`);
          const steamCMDData = await SteamCMD.getData(appId);
          if (typeof steamCMDData !== 'string') {
            const data = steamCMDData[appId];

            const appName = data.common.name;
            const appInstallDirectory = data.config.installdir;
            const appBuildId = data.depots.branches.public.buildid;
            const appBaseLanguages = data.depots.baselanguages;
            const appInstalledDepots = {} as Record<string, unknown>;
            const appSharedDepots = {} as Record<string, unknown>;
            let appSize;

            logger.debug(util.format('appName', appName));
            logger.debug(util.format('appInstallDirectory', appInstallDirectory));
            logger.debug(util.format('appBuildId', appBuildId));
            logger.debug(util.format('appBaseLanguages', appBaseLanguages));

            const dataDepots = data.depots;
            for (const depotId in dataDepots) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

            const appManifestAppIdFilePath = path.join(appSteamAppsRootPath, `appmanifest_${appId}.acf`);
            const appManifestOutput: SteamCMDAcf = {
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
              appManifestOutput.AppState.UserConfig.language = appBaseLanguages;
            }

            if (Object.keys(appInstalledDepots).length > 0) {
              appManifestOutput.AppState.InstalledDepots = appInstalledDepots;
            }

            if (Object.keys(appSharedDepots).length > 0) {
              appManifestOutput.AppState.SharedDepots = appSharedDepots;
            }

            await fsExtra.outputFile(
              appManifestAppIdFilePath,
              vdf.stringify(appManifestOutput, { pretty: true, indent: '    ' })
            );
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
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error) => logger.error(util.format(error)));
