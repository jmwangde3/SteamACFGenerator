/* eslint-disable unicorn/prevent-abbreviations */
import { basename, dirname } from 'node:path';
import { exec as pkgExec } from 'pkg';
import { need as pkgNeed } from 'pkg-fetch';
import fsExtra from 'fs-extra';
import rcedit from 'rcedit';
import AdmZip from 'adm-zip';
import logger from '../common/logger.js';
import {
  appIconFilePath,
  pkgCustomizedPrecompiledBinariesFilePath,
  pkgNodeVersion,
  pkgOriginalPrecompiledBinariesFilePath,
  pkgInputFilePath,
  pkgOutputFilePath,
  appReleaseRootPath,
  appReleaseFilePath,
} from '../common/paths.js';
import appInfo from '../../package.json';

const downloadPkgOriginalPrecompiledBinaries = async () => {
  logger.info('Download PKG Precompiled Binaries');
  if (!(await fsExtra.pathExists(pkgCustomizedPrecompiledBinariesFilePath))) {
    await pkgNeed({ nodeRange: `node${pkgNodeVersion}`, platform: 'win', arch: 'x64' });
    await fsExtra.rename(pkgOriginalPrecompiledBinariesFilePath, pkgCustomizedPrecompiledBinariesFilePath);
  }
};

const customizePkgInfoPrecompiledBinaries = async () => {
  logger.info('Customize PKG Info & Icon Precompiled Binaries');
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
};

const buildCustomizedExecutables = async () => {
  await fsExtra.emptyDir(dirname(pkgOutputFilePath));
  await pkgExec([pkgInputFilePath, '-C', 'Brotli', '-t', 'win', '-d', '-o', pkgOutputFilePath]);
};

const zipFiles = () => {
  logger.info('Create Release ZIP File');
  const zip = new AdmZip();
  zip.addLocalFolder(appReleaseRootPath);
  zip.writeZip(appReleaseFilePath);
};

downloadPkgOriginalPrecompiledBinaries()
  .then(customizePkgInfoPrecompiledBinaries)
  .then(buildCustomizedExecutables)
  .then(zipFiles)
  .then(() => {
    logger.info('Done');
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error) => logger.error(error));
