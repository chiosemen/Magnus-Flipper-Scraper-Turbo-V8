const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support workspace protocol (workspace:*)
config.resolver.disableHierarchicalLookup = false;

// Enable symlink resolution for pnpm workspace packages
config.resolver.unstable_enableSymlinks = true;

// Support importing from packages/* (monorepo packages)
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (name === '@repo') {
        return path.resolve(workspaceRoot, 'packages');
      }
      return path.join(projectRoot, `node_modules/${name}`);
    },
  }
);

module.exports = config;
