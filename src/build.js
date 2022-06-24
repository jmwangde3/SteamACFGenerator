const process = require('node:process');
const { rename } = require('node:fs/promises');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const pkg = require('pkg');
const pkgFetch = require('pkg-fetch');
const { pathExists } = require('fs-extra');
const { engines, name } = require('../package.json');

const appNodeVersion = engines.node.slice(1);
const appRootPath = process.cwd();
const appIconFilePath = join(appRootPath, 'build', 'resources', 'icon.ico');
const appVersionInfoFilePath = join(appRootPath, 'build', 'resources', 'VersionInfo');

const resourceHackerFilePath = join(appRootPath, 'build', 'ResourceHacker', 'ResourceHacker.exe');
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgCacheRootPath = join(appRootPath, 'build', '.pkg-cache');
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgOutputFilePath = join(appRootPath, 'build', 'release', `${name}.exe`);
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgOriginalPrecompiledBinariesFilePath = join(pkgCacheRootPath, `fetched-v${appNodeVersion}-win-x64`);
// eslint-disable-next-line unicorn/prevent-abbreviations
const pkgCustomizedPrecompiledBinariesFilePath = join(pkgCacheRootPath, `built-v${appNodeVersion}-win-x64`);

/**
 *  @param {Record<string, string>}  args
 * */
// eslint-disable-next-line unicorn/prevent-abbreviations
const invokeResourceHacker = (args) =>
  execSync(
    `${resourceHackerFilePath} ${Object.entries(args)
      .map(([key, value]) => `-${key} ${value}`)
      .join(' ')}`
  );

// eslint-disable-next-line unicorn/prevent-abbreviations
const downloadPkgOriginalPrecompiledBinaries = async () => {
  console.log('Download PKG Precompiled Binaries');
  if (!(await pathExists(pkgCustomizedPrecompiledBinariesFilePath))) {
    await pkgFetch.need({ nodeRange: `node${appNodeVersion}`, platform: 'win', arch: 'x64' });
    await rename(pkgOriginalPrecompiledBinariesFilePath, pkgCustomizedPrecompiledBinariesFilePath);
  }
};

// eslint-disable-next-line unicorn/prevent-abbreviations
const customizePkgIconPrecompiledBinaries = () => {
  console.log('Customize PKG Icon Precompiled Binaries');
  invokeResourceHacker({
    resource: appIconFilePath,
    mask: 'ICONGROUP,1,',
    action: 'addoverwrite',
    open: pkgCustomizedPrecompiledBinariesFilePath,
    save: pkgCustomizedPrecompiledBinariesFilePath,
  });
};

// eslint-disable-next-line unicorn/prevent-abbreviations
const customizePkgInfoPrecompiledBinaries = () => {
  console.log('Customize PKG Info Precompiled Binaries');
  invokeResourceHacker({
    action: 'compile',
    open: `${appVersionInfoFilePath}.rc`,
    save: `${appVersionInfoFilePath}.res`,
  });
  invokeResourceHacker({
    resource: `${appVersionInfoFilePath}.res`,
    action: 'addoverwrite',
    open: pkgCustomizedPrecompiledBinariesFilePath,
    save: pkgCustomizedPrecompiledBinariesFilePath,
  });
};

const buildCustomizedExecutables = async () => {
  await pkg.exec(['.', '-C', 'Brotli', '-t', 'win', '-o', pkgOutputFilePath]);
  console.log('Done');
};

downloadPkgOriginalPrecompiledBinaries()
  .then(customizePkgIconPrecompiledBinaries)
  .then(customizePkgInfoPrecompiledBinaries)
  .then(buildCustomizedExecutables)
  .catch((error) => console.error(error));
