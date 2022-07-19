import type { UserConfigExport } from 'vite';
import { builtinModules } from 'node:module';
import { join, basename } from 'node:path';
import { cwd } from 'node:process';
import { defineConfig } from 'vite';
import { dependencies, devDependencies } from '../package.json';

const builtinModulesNodeProtocol = builtinModules.map((module) => `node:${module}`);
const externalModules = [...Object.keys(dependencies), 'yargs/yargs', 'yargs/helpers'];
const externalModulesDevelopment = [...Object.keys(devDependencies), ...externalModules];
const appRootPath = cwd();

export default function createConfig(vitePackageRoot: string) {
  return defineConfig(() =>
    /* { mode }*/
    {
      // const isDevelopment = mode === 'development';
      const viteProcessModel = basename(vitePackageRoot);
      const viteOutDirectory = join(appRootPath, 'build', 'dist');
      const viteConfig: UserConfigExport = {
        root: vitePackageRoot,
        base: './',
        envDir: appRootPath,
        publicDir: false,
        build: {
          target: 'esnext',
          outDir: viteOutDirectory,
          emptyOutDir: false,
          lib: {
            entry: join(vitePackageRoot, 'index.ts'),
            fileName: viteProcessModel,
            formats: ['cjs'],
          },
          rollupOptions: {
            external: [
              ...(viteProcessModel === 'build' ? externalModulesDevelopment : externalModules),
              ...builtinModules,
              ...builtinModulesNodeProtocol,
            ],
          },
        },
      };

      if (viteProcessModel === 'build') {
        viteConfig.build!.minify = false;
      }

      return viteConfig;
    }
  );
}
