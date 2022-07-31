import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { parse as vdfParse } from 'vdf-parser';
import fsExtra from 'fs-extra';
import axios from 'axios';
import AdmZip from 'adm-zip';
import logger from '../common/logger';
import {
  appSteamAppsRootPath,
  appSteamCMDDownloadsRootPath,
  appSteamCMDExeFilePath,
  appSteamCMDInstalledRootPath,
} from '../common/paths';
import { isNumeric, acfGenerator } from './acf/acf-generator';

class SteamCMD {
  private downloadLink = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';

  private decompress = (zipPath: string, decompressTo: string) => {
    new AdmZip(zipPath).extractAllTo(decompressTo, true);
  };

  private downloadFile = async (url: string, saveTo: string) => {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });
    const data = response.data as Buffer;
    await fsExtra.ensureDir(dirname(saveTo));
    return fsExtra.writeFile(saveTo, data);
  };

  private downloadCMD = async () => {
    const dLinkSpl = this.downloadLink.split('/');
    const cmpName = dLinkSpl[dLinkSpl.length - 1];
    const cmpFilePath = join(appSteamCMDDownloadsRootPath, cmpName);
    if (!(await fsExtra.pathExists(appSteamCMDExeFilePath))) {
      logger.info('Download latest SteamCMD.exe...');
      await this.downloadFile(this.downloadLink, cmpFilePath);
      logger.info('Unzip SteamCMD.exe...');
      this.decompress(cmpFilePath, appSteamCMDInstalledRootPath);
    }
  };

  private parseStdout = (stdout: string) => {
    let b = '';
    let k: SteamCMDApi = {};
    let reg = false;

    for (const a of stdout.split('\n')) {
      const l = a;
      if (l.startsWith('"')) {
        reg = true;
      }

      if (l.startsWith('}')) {
        reg = false;
        b += '}';
      }

      if (reg) {
        b += `${l}\n`;
      } else if (b.length > 0) {
        const par = vdfParse(b);
        k = { ...k, ...par };
        b = '';
      }
    }

    return Object.keys(k).length > 0 ? k : stdout;
  };

  public execRaw = async (commands: string[]) => {
    await this.downloadCMD();

    return spawnSync(
      appSteamCMDExeFilePath,
      ['@ShutdownOnFailedCommand', '1', '@NoPromptForPassword', '1', '+login', 'anonymous', ...commands, '+quit'],
      {
        cwd: appSteamCMDInstalledRootPath,
        encoding: 'utf8',
      }
    );
  };

  public appsInfo = async (appIds: string[]) => {
    const appInfoPrint = [];
    for (const appId of appIds) {
      if (isNumeric(appId)) {
        appInfoPrint.push('+app_info_print', appId);
      } else {
        throw new Error(`The appId "${appId}" is invalid!`);
      }
    }

    if (appInfoPrint.length > 0) {
      logger.info('... DO NOT PANIC IF IT LOOKS STUCK!');

      // CLEANUP
      await fsExtra.remove(join(appSteamCMDInstalledRootPath, 'appcache'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'config'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'dumps'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'logs'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, 'steamapps'));
      // await fsExtra.remove(path.join(appSteamCMDInstalledRootPath, '4'));

      // The first call to app_info_print from a new install will return nothing,
      // and it will instead prep an entry for the info and request it.
      // It won't block though, and if the session closes before it can save,
      // the same issue will be present on next run.
      // Thus we use `app_update` to force the session to wait long enough to save.
      const preCommand = [...appInfoPrint, '+force_install_dir', './4', '+app_update', '4'];
      await this.execRaw(preCommand);

      // The output from app_update can collide with that of app_info_print,
      // so after ensuring the info is available we must re-run without app_update.
      logger.info(`Trying to get data of "${appIds.join(', ')}"...`);

      const command = ['+app_info_update', '1', ...appInfoPrint];
      const data = await this.execRaw(command);
      const stdout = data.stdout;

      const outputAppIdsData = this.parseStdout(stdout);
      if (typeof outputAppIdsData === 'object') {
        for (const outputAppId in outputAppIdsData) {
          if (Object.hasOwn(outputAppIdsData, outputAppId)) {
            const manifest = join(appSteamAppsRootPath, `appmanifest_${outputAppId}.acf`);
            const output = acfGenerator(Number(outputAppId), outputAppIdsData);
            await fsExtra.outputFile(manifest, output);
            logger.info(`${manifest} was written successfully!`);
          }
        }
      } else {
        logger.error(`Unknown error from SteamCMD!`);
        logger.error(outputAppIdsData);
      }
    }
  };

  public appInfo = async (appId: string) => this.appsInfo([appId]);
}

export default SteamCMD;
