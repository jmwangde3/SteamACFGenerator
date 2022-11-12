/* eslint-disable sonarjs/cognitive-complexity */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import AdmZip from 'adm-zip';
import axios from 'axios';
import fsExtra from 'fs-extra';
import { parse as vdfParse } from 'vdf-parser';
import logger from '../common/logger';
import {
  appSteamAppsRootPath,
  appSteamCMDDownloadsRootPath,
  appSteamCMDExeFilePath,
  appSteamCMDInstalledRootPath,
} from '../common/paths';
import { acfGenerator, isNumeric } from './acf/acf-generator';

class SteamCMD {
  private readonly downloadLink = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';

  private readonly decompress = (zipPath: string, decompressTo: string) => {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(decompressTo, true);
    logger.info(`${zipPath} was decompressed successfully!`);
  };

  private readonly downloadFile = async (url: string, saveTo: string) => {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    const data = response.data as Buffer;
    await fsExtra.ensureDir(dirname(saveTo));
    await fsExtra.writeFile(saveTo, data);
    logger.info(`${url} was downloaded successfully!`);
  };

  private readonly downloadCMD = async () => {
    const dLinkSpl = this.downloadLink.split('/');
    const cmpName = dLinkSpl[dLinkSpl.length - 1];
    const cmpFilePath = join(appSteamCMDDownloadsRootPath, cmpName);
    if (!(await fsExtra.pathExists(appSteamCMDExeFilePath))) {
      logger.info('Download latest version of SteamCMD...');
      await this.downloadFile(this.downloadLink, cmpFilePath);
      logger.info(`Decompress zip to ${appSteamCMDInstalledRootPath}...`);
      this.decompress(cmpFilePath, appSteamCMDInstalledRootPath);
    } else {
      logger.info(`Skip SteamCMD download, installation found: ${appSteamCMDExeFilePath}`);
    }
  };

  private readonly parseStdout = (stdout: string) => {
    let a = '';
    let b: SteamCMDApi = {};
    let c = false;

    for (const d of stdout.split('\n')) {
      const e = d;

      if (e.startsWith('"')) {
        c = true;
      }

      if (e.startsWith('}')) {
        c = false;
        a += '}';
      }

      if (c) {
        a += `${e}\n`;
      } else if (a.length > 0) {
        b = {
          ...b,
          ...vdfParse(a, { types: false, arrayify: true }),
        };
        a = '';
      }
    }

    return Object.keys(b).length > 0 ? b : stdout;
  };

  public execRaw = (commands: string[]) =>
    spawnSync(
      appSteamCMDExeFilePath,
      ['@ShutdownOnFailedCommand', '1', '@NoPromptForPassword', '1', '+login', 'anonymous', ...commands, '+quit'],
      {
        cwd: appSteamCMDInstalledRootPath,
        encoding: 'utf8',
      }
    );

  public appsInfo = async (appIds: string[]) => {
    if (appIds.length > 0) {
      logger.info('!DO NOT PANIC IF IT LOOKS STUCK!');

      const appInfoPrint = [];
      for (const appId of appIds) {
        if (isNumeric(appId)) {
          appInfoPrint.push('+app_info_print', appId);
        } else {
          throw new Error(`The appId "${appId}" is invalid!`);
        }
      }

      // DOWNLOAD CMD
      await this.downloadCMD();

      // CLEANUP
      logger.info('Remove junk and cache from SteamCMD...');

      await fsExtra.remove(join(appSteamCMDInstalledRootPath, 'appcache'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'config'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'dumps'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'logs'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'steamapps'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, '4'));

      logger.info('I run preCommand to prevent issues with SteamCMD...');
      // The first call to app_info_print from a new install will return nothing,
      // and it will instead prep an entry for the info and request it.
      // It won't block though, and if the session closes before it can save,
      // the same issue will be present on next run.
      // Thus we use `app_update` to force the session to wait long enough to save.
      const preCommand = [...appInfoPrint, '+force_install_dir', './4', '+app_update', '4'];
      this.execRaw(preCommand);

      // The output from app_update can collide with that of app_info_print,
      // so after ensuring the info is available we must re-run without app_update.
      logger.info(`Trying to get data of "${appIds.join(', ')}"...`);

      const command = ['+app_info_update', '1', ...appInfoPrint];
      const data = this.execRaw(command);

      const outputAppIdsData = this.parseStdout(data.stdout);
      if (typeof outputAppIdsData === 'object') {
        for (const outputAppId in outputAppIdsData) {
          if (Object.prototype.hasOwnProperty.call(outputAppIdsData, outputAppId)) {
            const manifest = join(appSteamAppsRootPath, `appmanifest_${outputAppId}.acf`);
            const output = acfGenerator(Number(outputAppId), outputAppIdsData);
            await fsExtra.outputFile(manifest, output);
            logger.info(`${manifest} was written successfully!`);
          }
        }
      } else {
        logger.error('Unknown error from SteamCMD:');
        logger.error(outputAppIdsData);
      }
    } else {
      logger.error('You have not entered any appId!');
    }
  };

  public appInfo = (appId: string) => this.appsInfo([appId]);
}

export default SteamCMD;
