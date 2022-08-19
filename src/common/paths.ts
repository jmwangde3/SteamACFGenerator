import { join } from 'node:path';
import process from 'node:process';
import { engines, name } from '../../package.json';

const appIsPackaged = typeof (process as unknown as Record<string, unknown>).pkg !== 'undefined';

export const appRootPath = process.cwd();
export const appIconFilePath = join(appRootPath, 'build', 'resources', 'icon.ico');

export const appReleaseRootPath = join(appRootPath, 'build', 'release');
export const appReleaseFilePath = join(appRootPath, 'build', 'release', `${name}.zip`);

export const appLoggerRootPath = appIsPackaged ? appRootPath : join(appRootPath, 'debug');
export const appSteamAppsRootPath = appIsPackaged
  ? join(appRootPath, 'steamapps')
  : join(appRootPath, 'debug', 'steamapps');

export const appSteamCMDRootPath = appIsPackaged
  ? join(appRootPath, 'steamcmd')
  : join(appRootPath, 'debug', 'steamcmd');
export const appSteamCMDInstalledRootPath = join(appSteamCMDRootPath, 'installed');
export const appSteamCMDExeFilePath = join(appSteamCMDInstalledRootPath, 'steamcmd.exe');
export const appSteamCMDDownloadsRootPath = join(appSteamCMDRootPath, 'downloads');

export const pkgCacheRootPath = join(appRootPath, 'build', '.pkg-cache');
export const pkgInputFilePath = join(appRootPath, 'build', 'dist', 'main.js');
export const pkgOutputFilePath = join(appReleaseRootPath, `${name}.exe`);
export const pkgNodeVersion = engines.node.slice(1);
export const pkgOriginalPrecompiledBinariesFilePath = join(pkgCacheRootPath, `fetched-v${pkgNodeVersion}-win-x64`);
export const pkgCustomizedPrecompiledBinariesFilePath = join(pkgCacheRootPath, `built-v${pkgNodeVersion}-win-x64`);
