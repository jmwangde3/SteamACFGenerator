import childProcess from 'node:child_process';
import path from 'node:path';
import fsExtra from 'fs-extra';
import vdf from 'vdf-parser';
import { steamCMDExeFilePath, steamCMDStdoutRootPath, steamCMDRootPath } from '../common/paths';

class SteamCMD {
  private static invoke(commands: string[]) {
    // eslint-disable-next-line n/no-sync
    return childProcess.spawnSync(steamCMDExeFilePath, ['+login', 'anonymous', ...commands, '+quit'], {
      cwd: steamCMDRootPath,
    });
  }

  public static async getData(appId: string) {
    // CLEANUP
    await fsExtra.remove(path.join(steamCMDRootPath, 'appcache'));
    // await fs.remove(path.join(steamCMDRootPath, 'config'));
    // await fs.remove(path.join(steamCMDRootPath, 'dumps'));
    // await fs.remove(path.join(steamCMDRootPath, 'logs'));
    // await fs.remove(path.join(steamCMDRootPath, 'steamapps'));

    // The first call to app_info_print from a new install will return nothing,
    // and it will instead prep an entry for the info and request it.
    // It won't block though, and if the session closes before it can save,
    // the same issue will be present on next run.
    // Thus we use `app_update` to force the session to wait long enough to save.
    const preCommand = ['+app_info_print', appId, '+force_install_dir', './4', '+app_update', '4'];
    SteamCMD.invoke(preCommand);

    // The output from app_update can collide with that of app_info_print,
    // so after ensuring the info is available we must re-run without app_update.
    const command = ['+app_info_update', '1', '+app_info_print', appId];
    const data = SteamCMD.invoke(command).stdout.toString();

    await fsExtra.outputFile(path.join(steamCMDStdoutRootPath, `${appId}.txt`), data);

    const vdfRegex = /"\d+"[\s\S][^{]*\{[\s\S]+\}/gu;
    const vdfMatch = data.match(vdfRegex);
    return vdfMatch !== null ? (vdf.parse(vdfMatch.toString()) as SteamCMDApi) : data;
  }
}

export default SteamCMD;
