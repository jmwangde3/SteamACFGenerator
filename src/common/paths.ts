import process from 'node:process';
import path from 'node:path';
import appInfo from '../../package.json';

const appIsPackaged = typeof (process as unknown as Record<string, unknown>).pkg !== 'undefined';

export const appRootPath = process.cwd();
export const appIconFilePath = path.join(appRootPath, 'build', 'resources', 'icon.ico');

export const appLoggerRootPath = appIsPackaged
  ? path.join(appRootPath, 'data', 'logs')
  : path.join(appRootPath, 'build', 'data', 'logs');
export const appSteamAppsRootPath = appIsPackaged
  ? path.join(appRootPath, 'data', 'steamapps')
  : path.join(appRootPath, 'build', 'data', 'steamapps');

export const appReleaseRootPath = path.join(appRootPath, 'build', 'release');
export const appReleaseFilePath = path.join(appRootPath, 'build', 'release', `${appInfo.name}.zip`);

export const steamCMDFilePath = path.join(appRootPath, 'build', 'bin', 'steamcmd', 'SteamCMD.exe');
export const steamCMDToFilePath = path.join(appReleaseRootPath, 'steamcmd', `steamcmd.exe`);
export const steamCMDExeFilePath = appIsPackaged
  ? path.join(appRootPath, 'steamcmd', `steamcmd.exe`)
  : path.join(appRootPath, 'build', 'bin', 'steamcmd', 'steamcmd.exe');
export const steamCMDRootPath = path.dirname(steamCMDExeFilePath);
export const steamCMDStdoutRootPath = appIsPackaged
  ? path.join(appRootPath, 'data', 'steamcmd_stdout')
  : path.join(appRootPath, 'build', 'data', 'steamcmd_stdout');

// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgCacheRootPath = path.join(appRootPath, 'build', '.pkg-cache');
// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgInputFilePath = path.join(appRootPath, 'build', 'dist', 'main.js');
// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgOutputFilePath = path.join(appReleaseRootPath, `${appInfo.name}.exe`);
// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgNodeVersion = appInfo.engines.node.slice(1);
// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgOriginalPrecompiledBinariesFilePath = path.join(pkgCacheRootPath, `fetched-v${pkgNodeVersion}-win-x64`);
// eslint-disable-next-line unicorn/prevent-abbreviations
export const pkgCustomizedPrecompiledBinariesFilePath = path.join(pkgCacheRootPath, `built-v${pkgNodeVersion}-win-x64`);

export default {};
