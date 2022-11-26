/* eslint-disable sonarjs/cognitive-complexity */
/**
 * IT IS SHARED BETWEEN
 * https://github.com/Sak32009/GetDLCInfoFromSteamDB
 * AND
 * https://github.com/Sak32009/SteamACFGenerator
 * VERSION: 1.0.5
 */
import { stringify as vdfStringify } from 'vdf-parser';
import acfConsole from './acf-console';

export const isNumeric = (str: string) => /^\d+$/u.test(str);

export const acfGenerator = (appId: number, steamCMDData: SteamCMDApi) => {
  const data = steamCMDData[appId];
  const appName = data.common.name;
  const appInstallDirectory = data.config.installdir;
  const appBuildId = data.depots.branches.public.buildid;
  // const appBaseLanguages = data.depots.baselanguages;
  const appInstalledDepots: SteamCMDAcfInstalledDepots = {};
  const appSharedDepots: SteamCMDAcfSharedDepots = {};
  let appSize = 0;

  acfConsole.debug('appName', appName);
  acfConsole.debug('appInstallDirectory', appInstallDirectory);
  acfConsole.debug('appBuildId', appBuildId);
  // acfConsole.debug('appBaseLanguages', appBaseLanguages);

  const appDataDepots = data.depots;
  for (const depotId in appDataDepots) {
    if (Object.prototype.hasOwnProperty.call(appDataDepots, depotId)) {
      if (isNumeric(depotId)) {
        const depotData = appDataDepots[depotId];
        const depotName = depotData.name;
        const depotSize = depotData.maxsize === undefined ? 0 : depotData.maxsize;
        const depotManifestId = depotData.manifests === undefined ? undefined : depotData.manifests.public;
        const depotOs =
          depotData.config !== undefined && depotData.config.oslist !== undefined ? depotData.config.oslist : undefined;
        const depotIsDlc = depotData.dlcappid === undefined ? undefined : depotData.dlcappid;
        const depotIsSharedInstall = depotData.sharedinstall === undefined ? undefined : depotData.depotfromapp;

        acfConsole.debug(`-------------------------- depotId ${depotId}`);
        acfConsole.debug('depotName', depotName);
        acfConsole.debug('depotSize', depotSize);
        acfConsole.debug('depotManifestId', depotManifestId);
        acfConsole.debug('depotOs', depotOs);
        acfConsole.debug('depotIsDlc', depotIsDlc);
        acfConsole.debug('depotIsSharedInstall', depotIsSharedInstall);

        // ONLY WINDOWS
        if (depotOs === undefined || depotOs === 'windows') {
          if (depotIsSharedInstall !== undefined) {
            appSharedDepots[depotId] = depotIsSharedInstall;
          } else if (depotManifestId === undefined) {
            acfConsole.info(`${depotId} it is an unused depot.`);
          } else {
            // NOTE: first depot contains the game size
            if (appSize === 0) {
              appSize = depotSize;
              acfConsole.debug('appSize', appSize, '(it is normal if it is displayed after!)');
            }

            appInstalledDepots[depotId] =
              depotIsDlc === undefined
                ? {
                    manifest: depotManifestId,
                    size: depotSize,
                  }
                : {
                    manifest: depotManifestId,
                    size: depotSize,
                    dlcappid: depotIsDlc,
                  };
          }
        } else {
          acfConsole.info(`${depotId} it is not a valid depot for Windows OS.`);
        }
      } else {
        acfConsole.info(`${depotId} SKIP...`);
      }
    }
  }

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
    },
  };

  /*
  if (typeof appBaseLanguages !== 'undefined') {
    appManifestOutput.AppState.UserConfig!.language = appBaseLanguages
  }
  */

  if (Object.keys(appInstalledDepots).length > 0) {
    appManifestOutput.AppState.InstalledDepots = appInstalledDepots;
  }

  if (Object.keys(appSharedDepots).length > 0) {
    appManifestOutput.AppState.SharedDepots = appSharedDepots;
  }

  return vdfStringify(appManifestOutput, { pretty: true, indent: '\t' }).replaceAll('" "', '"\t\t"');
};
