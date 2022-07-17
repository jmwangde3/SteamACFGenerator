const process = require('node:process');
const childProcess = require('child_process');
const path = require('node:path');
const fs = require('fs-extra');
const vdf = require('vdf-parser');

const appRootPath = process.cwd();
const steamCMDFilePath =
  // @ts-ignore
  typeof process.pkg === 'undefined'
    ? path.join(appRootPath, 'build', 'bin', 'steamcmd', 'steamcmd.exe')
    : path.join(appRootPath, 'steamcmd', `steamcmd.exe`);

/**
 * @param {string} appId
 * */
const steamCMDGetData = async (appId) => {
  const steamCMDRootPath = path.dirname(steamCMDFilePath);

  await fs.remove(path.join(steamCMDRootPath, 'appcache'));
  // await fs.remove(path.join(steamCMDRootPath, 'config'));
  // await fs.remove(path.join(steamCMDRootPath, 'dumps'));
  // await fs.remove(path.join(steamCMDRootPath, 'logs'));
  // await fs.remove(path.join(steamCMDRootPath, 'steamapps'));

  // eslint-disable-next-line node/no-sync
  const data = childProcess.execFileSync(
    steamCMDFilePath,
    ['+login', 'anonymous', '+app_info_print', appId, '+app_info_update', '1', '+quit'],
    {
      cwd: steamCMDRootPath,
      encoding: 'utf8',
    }
  );
  const vdfRegex = /"\d+"[\s\S][^{]*\{[\s\S]+\}/gu;
  const vdfMatch = data.match(vdfRegex);
  return vdfMatch !== null ? vdf.parse(vdfMatch.toString()) : data;
};

module.exports = steamCMDGetData;
