import { basename, dirname } from 'node:path';
import AdmZip from 'adm-zip';
import fsExtra from 'fs-extra';
import { exec as pkgExec } from 'pkg';
import { need as pkgNeed } from 'pkg-fetch';
import rcedit from 'rcedit';
import appInfo from '../../package.json';
import logger from '../common/logger';
import {
  appIconFilePath,
  appReleaseFilePath,
  appReleaseRootPath,
  pkgCustomizedPrecompiledBinariesFilePath,
  pkgInputFilePath,
  pkgNodeVersion,
  pkgOriginalPrecompiledBinariesFilePath,
  pkgOutputFilePath,
} from '../common/paths';

const downloadPkgOriginalPrecompiledBinaries = async () => {
  if (!(await fsExtra.pathExists(pkgCustomizedPrecompiledBinariesFilePath))) {
    logger.info('Download PKG Original Precompiled Binaries...');
    await pkgNeed({ nodeRange: `node${pkgNodeVersion}`, platform: 'win', arch: 'x64' });
    await fsExtra.rename(pkgOriginalPrecompiledBinariesFilePath, pkgCustomizedPrecompiledBinariesFilePath);
    logger.info('...DONE');
  }
};

const customizePkgResourcesPrecompiledBinaries = async () => {
  logger.info('Customize PKG Resources Precompiled Binaries...');
  await rcedit(pkgCustomizedPrecompiledBinariesFilePath, {
    icon: appIconFilePath,
    'file-version': appInfo.version,
    'product-version': appInfo.version,
    'version-string': {
      CompanyName: appInfo.author,
      FileDescription: appInfo.description,
      InternalFilename: basename(pkgOutputFilePath),
      OriginalFilename: basename(pkgOutputFilePath),
      LegalCopyright: appInfo.copyright,
      ProductName: appInfo.name,
    },
  });
  logger.info('...DONE');
};

const buildCustomizedExecutable = async () => {
  logger.info('Build Customized Executable...');
  await fsExtra.emptyDir(dirname(pkgOutputFilePath));
  await pkgExec([pkgInputFilePath, '-C', 'Brotli', '-t', 'win', '-o', pkgOutputFilePath]);
  logger.info('...DONE');
};

const createZipCustomizedExecutable = () => {
  logger.info('Create ZIP Customized Executable...');
  const zip = new AdmZip();
  zip.addLocalFolder(appReleaseRootPath);
  zip.writeZip(appReleaseFilePath);
  logger.info('...DONE');
};

downloadPkgOriginalPrecompiledBinaries()
  .then(customizePkgResourcesPrecompiledBinaries)
  .then(buildCustomizedExecutable)
  .then(createZipCustomizedExecutable)
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error) => logger.error(error));
