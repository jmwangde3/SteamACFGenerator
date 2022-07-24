import process from 'node:process';
import path from 'node:path';
import fsExtra from 'fs-extra';
import yargs from 'yargs/yargs';
import yargsHelpers from 'yargs/helpers';
import appInfo from '../../package.json';
import logger from '../common/logger';
import { appSteamAppsRootPath } from '../common/paths';
import { isNumeric, acfGenerator } from './acf/acf-generator';
import SteamCMD from './steamcmd';

yargs(yargsHelpers.hideBin(process.argv))
  .strict()
  .version(appInfo.version)
  .usage(`./$0 - v${appInfo.version} - follow the instructions below`)
  .example('./$0 --appids 601150', 'this is an example for single appId')
  .example('./$0 --appids 601150 1593500', 'this is an example for multiple appIds')
  .option('appids', {
    array: true,
    string: true,
    describe: 'You can set a single appId or multiple appIds',
    demandOption: true,
  })
  .parseAsync()
  .then(async (argv) => {
    const appIds = argv.appids;
    if (appIds.length > 0) {
      for (const appId of appIds) {
        if (isNumeric(appId)) {
          logger.info(`Trying to get data of ${appId}... DO NOT PANIC IF IT LOOKS STUCK`);
          const steamCMDData = await SteamCMD.getData(appId);
          if (typeof steamCMDData !== 'string') {
            const manifest = path.join(appSteamAppsRootPath, `appmanifest_${appId}.acf`);
            const output = acfGenerator(Number(appId), steamCMDData);
            await fsExtra.outputFile(manifest, output);
            logger.info(`${manifest} was written successfully!`);
          } else {
            logger.error(`Unknown error from SteamCMD!`);
            logger.error(steamCMDData);
          }
        } else {
          logger.error(`The appId "${appId}" is invalid!`);
        }
      }
    } else {
      logger.error('You have not entered any appid!');
    }
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error) => logger.error(error));
