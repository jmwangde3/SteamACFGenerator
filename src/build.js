const process = require('node:process');
const util = require('node:util');
const path = require('node:path');
const pkg = require('pkg');
const pkgFetch = require('pkg-fetch');
const fsExtra = require('fs-extra');
const rcedit = require('rcedit');
const AdmZip = require('adm-zip');
const appInfo = require('../package.json');
const logger = require('./logger.js');

const appRootPath = process.cwd();
const appIconFilePath = path.join(appRootPath, 'build', 'resources', 'icon.ico');

const appReleaseRootPath = path.join(appRootPath, 'build', 'release', appInfo.version);
const appReleaseFilePath = path.join(
  appRootPath,
  'build',
  'release',
  appInfo.version,
  `${appInfo.name}-v${appInfo.version}.zip`
);

const steamCMDFilePath = path.join(appRootPath, 'build', 'bin', 'steamcmd', 'SteamCMD.exe');
const steamCMDToFilePath = path.join(appReleaseRootPath, 'steamcmd', `steamcmd.exe`);

// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgCacheRootPath = path.join(appRootPath, 'build', '.pkg-cache');
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgOutputFilePath = path.join(appReleaseRootPath, `${appInfo.name}.exe`);
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgNodeVersion = appInfo.engines.node.slice(1);
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgOriginalPrecompiledBinariesFilePath = path.join(pkgCacheRootPath, `fetched-v${pkgNodeVersion}-win-x64`);
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgCustomizedPrecompiledBinariesFilePath = path.join(pkgCacheRootPath, `built-v${pkgNodeVersion}-win-x64`);

// eslint-disable-next-line unicorn/prevent-abbreviations
const downloadPkgOriginalPrecompiledBinaries = async () => {
  logger.info('Download PKG Precompiled Binaries');
  if (!(await fsExtra.pathExists(pkgCustomizedPrecompiledBinariesFilePath))) {
    await pkgFetch.need({ nodeRange: `node${pkgNodeVersion}`, platform: 'win', arch: 'x64' });
    await fsExtra.rename(pkgOriginalPrecompiledBinariesFilePath, pkgCustomizedPrecompiledBinariesFilePath);
  }
};

// eslint-disable-next-line unicorn/prevent-abbreviations
const customizePkgInfoPrecompiledBinaries = async () => {
  logger.info('Customize PKG Info & Icon Precompiled Binaries');
  await rcedit(pkgCustomizedPrecompiledBinariesFilePath, {
    icon: appIconFilePath,
    'file-version': appInfo.version,
    'product-version': appInfo.version,
    'version-string': {
      CompanyName: appInfo.author,
      FileDescription: appInfo.description,
      InternalFilename: path.basename(pkgOutputFilePath),
      OriginalFilename: path.basename(pkgOutputFilePath),
      LegalCopyright: appInfo.copyright,
      ProductName: appInfo.name,
    },
  });
};

const buildCustomizedExecutables = async () => {
  await fsExtra.emptyDir(path.dirname(pkgOutputFilePath));
  await pkg.exec(['.', '-C', 'Brotli', '-t', 'win', '-o', pkgOutputFilePath]);
};

const copySteamCMDToRelease = async () => {
  await fsExtra.copy(steamCMDFilePath, steamCMDToFilePath);
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
  .then(copySteamCMDToRelease)
  .then(zipFiles)
  .then(() => {
    logger.info('Done');
  })
  .catch((error) => logger.error(util.format(error)));
