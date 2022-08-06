import { argv } from 'node:process'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { version } from '../../package.json'
import logger from '../common/logger'
import SteamCMD from './steamcmd'

yargs(hideBin(argv))
  .strict()
  .version(version)
  .usage(`./$0 - v${version} - follow the instructions below`)
  .example('./$0 --appids 601150', 'this is an example for single appId')
  .example('./$0 --appids 601150 1593500', 'this is an example for multiple appIds')
  .option('appids', {
    array: true,
    string: true,
    describe: 'You can set a single appId or multiple appIds',
    demandOption: true
  })
  .parseAsync()
  .then(async ({ appids: appIds }) => {
    const steamcmd = new SteamCMD()
    await steamcmd.appsInfo(appIds)
  })
  .catch((error) => logger.error(error))
